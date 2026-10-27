import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, isCloudConnected } from './firebase-config';
import { ProjectState } from '../core/types';
import {
  createModernStudioTemplate,
  createTwoBedroomSuiteTemplate,
  createCoohomCurvedShowcaseTemplate
} from '../core/templates';

export interface SavedProjectItem {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnailUrl?: string;
  roomCount: number;
  totalAreaM2: number;
  wallCount: number;
  templateType?: string;
  state: ProjectState;
}

const getUserIndexKey = (uid: string) => `aurabim_index_${uid}`;
const getProjectKey = (uid: string, pid: string) => `aurabim_proj_${uid}_${pid}`;

function safeGetItem(key: string): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
}

function safeSetItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

function safeRemoveItem(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

class ProjectRepository {
  /**
   * Lists all projects strictly belonging to the specified user
   */
  public async listProjects(userId: string): Promise<SavedProjectItem[]> {
    const list: SavedProjectItem[] = [];

    // 1. Try Firebase Firestore if cloud is live
    if (db && isCloudConnected) {
      try {
        const userProjectsRef = collection(db, 'users', userId, 'projects');
        const q = query(userProjectsRef, orderBy('updatedAt', 'desc'), limit(50));
        const snap = await getDocs(q);

        snap.forEach(docSnap => {
          const data = docSnap.data() as SavedProjectItem;
          if (data && data.userId === userId) {
            list.push(data);
          }
        });

        if (list.length > 0) return list;
      } catch (err) {
        console.warn('Firestore listProjects warning, falling back to local mirror:', err);
      }
    }

    // 2. Read from User-Scoped LocalStorage mirror
    try {
      const indexRaw = safeGetItem(getUserIndexKey(userId));
      const projectIds: string[] = indexRaw ? JSON.parse(indexRaw) : [];

      for (const id of projectIds) {
        const itemRaw = safeGetItem(getProjectKey(userId, id));
        if (itemRaw) {
          const item = JSON.parse(itemRaw) as SavedProjectItem;
          // Strictly verify ownership - never leak other accounts' projects
          if (item && item.userId === userId) {
            list.push(item);
          }
        }
      }

      list.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      console.warn('LocalStorage listProjects error:', err);
    }

    return list;
  }

  /**
   * Retrieves full project state by ID for a specific user
   */
  public async getProject(userId: string, projectId: string): Promise<SavedProjectItem | null> {
    if (db && isCloudConnected) {
      try {
        const docRef = doc(db, 'users', userId, 'projects', projectId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as SavedProjectItem;
          if (data && data.userId === userId) {
            return data;
          }
        }
      } catch (err) {
        console.warn('Firestore getProject error, checking local store:', err);
      }
    }

    const localRaw = safeGetItem(getProjectKey(userId, projectId));
    if (localRaw) {
      const item = JSON.parse(localRaw) as SavedProjectItem;
      if (item && item.userId === userId) {
        return item;
      }
    }
    return null;
  }

  /**
   * Saves or updates a project document strictly partitioned by userId
   */
  public async saveProject(
    userId: string,
    state: ProjectState,
    thumbnailUrl?: string,
    templateType?: string
  ): Promise<SavedProjectItem> {
    const wallCount = Object.keys(state.walls || {}).length;
    const roomCount = Object.keys(state.rooms || {}).length;
    let totalAreaM2 = 0;
    for (const r of Object.values(state.rooms || {})) {
      totalAreaM2 += r.areaSquareMeters;
    }
    totalAreaM2 = Math.round(totalAreaM2 * 10) / 10;

    const now = Date.now();
    const existing = await this.getProject(userId, state.id);

    const projectItem: SavedProjectItem = {
      id: state.id,
      userId,
      name: state.name || 'Untitled Project',
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      thumbnailUrl: thumbnailUrl || existing?.thumbnailUrl,
      roomCount,
      totalAreaM2,
      wallCount,
      templateType: templateType || existing?.templateType || 'custom',
      state
    };

    // 1. Save to User-Scoped LocalStorage mirror immediately
    this.saveToLocal(userId, projectItem);

    // 2. Sync to Firebase Firestore asynchronously if cloud connected
    if (db && isCloudConnected) {
      try {
        const docRef = doc(db, 'users', userId, 'projects', state.id);
        await setDoc(docRef, projectItem, { merge: true });
      } catch (err) {
        console.warn('Firestore sync error:', err);
      }
    }

    return projectItem;
  }

  /**
   * Deletes a project by ID from the user's workspace
   */
  public async deleteProject(userId: string, projectId: string): Promise<void> {
    // 1. Remove from user-scoped local storage
    safeRemoveItem(getProjectKey(userId, projectId));
    const indexRaw = safeGetItem(getUserIndexKey(userId));
    if (indexRaw) {
      const ids: string[] = JSON.parse(indexRaw);
      const filtered = ids.filter(id => id !== projectId);
      safeSetItem(getUserIndexKey(userId), JSON.stringify(filtered));
    }

    // 2. Remove from Firestore
    if (db && isCloudConnected) {
      try {
        const docRef = doc(db, 'users', userId, 'projects', projectId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Firestore delete error:', err);
      }
    }
  }

  /**
   * Duplicates an existing project
   */
  public async duplicateProject(userId: string, projectId: string): Promise<SavedProjectItem | null> {
    const original = await this.getProject(userId, projectId);
    if (!original) return null;

    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const clonedState: ProjectState = {
      ...JSON.parse(JSON.stringify(original.state)),
      id: newId,
      name: `${original.name} (Copy)`
    };

    return this.saveProject(userId, clonedState, original.thumbnailUrl, original.templateType);
  }

  /**
   * Populates default showcase sample projects if user has no projects yet
   */
  public async seedDefaultProjectsIfEmpty(userId: string): Promise<void> {
    const existing = await this.listProjects(userId);
    if (existing.length > 0) return;

    // Seed 1: Coohom Curved Showcase Penthouse
    const p1 = createCoohomCurvedShowcaseTemplate();
    p1.id = `proj_${userId}_penthouse`;
    p1.name = 'Luxury Curved Penthouse';
    await this.saveProject(userId, p1, undefined, 'curved_penthouse');

    // Seed 2: Modern 2-Bedroom Suite
    const p2 = createTwoBedroomSuiteTemplate();
    p2.id = `proj_${userId}_2bed`;
    p2.name = 'Modern 2-Bedroom Suite';
    await this.saveProject(userId, p2, undefined, 'two_bedroom');

    // Seed 3: Modern Studio
    const p3 = createModernStudioTemplate();
    p3.id = `proj_${userId}_studio`;
    p3.name = 'Urban Studio Loft';
    await this.saveProject(userId, p3, undefined, 'studio_loft');
  }

  private saveToLocal(userId: string, item: SavedProjectItem) {
    try {
      safeSetItem(getProjectKey(userId, item.id), JSON.stringify(item));
      const indexRaw = safeGetItem(getUserIndexKey(userId));
      const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];
      if (!ids.includes(item.id)) {
        ids.unshift(item.id);
        safeSetItem(getUserIndexKey(userId), JSON.stringify(ids));
      }
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }
  }
}

export const projectRepository = new ProjectRepository();
