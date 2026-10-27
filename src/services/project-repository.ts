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

const LOCAL_STORAGE_PREFIX = 'aurabim_proj_';
const LOCAL_INDEX_KEY = 'aurabim_project_index';

class ProjectRepository {
  /**
   * Lists all projects belonging to the specified user
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
          list.push(docSnap.data() as SavedProjectItem);
        });

        if (list.length > 0) return list;
      } catch (err) {
        console.warn('Firestore listProjects warning, falling back to local mirror:', err);
      }
    }

    // 2. Read from LocalStorage mirror
    try {
      const indexRaw = localStorage.getItem(LOCAL_INDEX_KEY);
      const projectIds: string[] = indexRaw ? JSON.parse(indexRaw) : [];

      for (const id of projectIds) {
        const itemRaw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${id}`);
        if (itemRaw) {
          const item = JSON.parse(itemRaw) as SavedProjectItem;
          if (item.userId === userId || !item.userId || item.userId.startsWith('guest_')) {
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
   * Retrieves full project state by ID
   */
  public async getProject(userId: string, projectId: string): Promise<SavedProjectItem | null> {
    if (db && isCloudConnected) {
      try {
        const docRef = doc(db, 'users', userId, 'projects', projectId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as SavedProjectItem;
        }
      } catch (err) {
        console.warn('Firestore getProject error, checking local store:', err);
      }
    }

    const localRaw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${projectId}`);
    return localRaw ? JSON.parse(localRaw) : null;
  }

  /**
   * Saves or updates a project document
   */
  public async saveProject(
    userId: string,
    state: ProjectState,
    thumbnailUrl?: string,
    templateType?: string
  ): Promise<SavedProjectItem> {
    const wallCount = Object.keys(state.walls).length;
    const roomCount = Object.keys(state.rooms).length;
    let totalAreaM2 = 0;
    for (const r of Object.values(state.rooms)) {
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

    // 1. Save to LocalStorage mirror immediately
    this.saveToLocal(projectItem);

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
   * Deletes a project by ID
   */
  public async deleteProject(userId: string, projectId: string): Promise<void> {
    // 1. Remove from local storage
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${projectId}`);
    const indexRaw = localStorage.getItem(LOCAL_INDEX_KEY);
    if (indexRaw) {
      const ids: string[] = JSON.parse(indexRaw);
      const filtered = ids.filter(id => id !== projectId);
      localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(filtered));
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
    p1.id = `proj_showcase_penthouse`;
    p1.name = 'Luxury Curved Penthouse';
    await this.saveProject(userId, p1, undefined, 'curved_penthouse');

    // Seed 2: Modern 2-Bedroom Suite
    const p2 = createTwoBedroomSuiteTemplate();
    p2.id = `proj_modern_2bed`;
    p2.name = 'Modern 2-Bedroom Suite';
    await this.saveProject(userId, p2, undefined, 'two_bedroom');

    // Seed 3: Modern Studio
    const p3 = createModernStudioTemplate();
    p3.id = `proj_studio_loft`;
    p3.name = 'Urban Studio Loft';
    await this.saveProject(userId, p3, undefined, 'studio_loft');
  }

  private saveToLocal(item: SavedProjectItem) {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${item.id}`, JSON.stringify(item));
      const indexRaw = localStorage.getItem(LOCAL_INDEX_KEY);
      const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];
      if (!ids.includes(item.id)) {
        ids.unshift(item.id);
        localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(ids));
      }
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }
  }
}

export const projectRepository = new ProjectRepository();
