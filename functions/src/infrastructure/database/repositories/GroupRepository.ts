// GroupRepository - גישה לנתוני groups ב-Firestore

import * as admin from 'firebase-admin';
import { GroupData } from '../../../domain/entities/types';

export class GroupRepository {
  constructor(private db: admin.firestore.Firestore) {}

  async findById(id: string): Promise<GroupData | null> {
    const doc = await this.db.collection('groups').doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as GroupData;
  }

  async findByIds(ids: string[]): Promise<GroupData[]> {
    if (ids.length === 0) return [];
    
    const groupDocs = await Promise.all(
      ids.map(id => this.db.collection('groups').doc(id).get())
    );
    
    const groups: GroupData[] = [];
    for (const groupDoc of groupDocs) {
      if (groupDoc.exists) {
        const gData = groupDoc.data() as GroupData;
        let parentName: string | undefined;
        if (gData?.parent_id) {
          const pDoc = await this.db.collection('groups').doc(gData.parent_id).get();
          if (pDoc.exists) parentName = pDoc.data()?.name;
        }
        groups.push({ ...gData, name: gData?.name || 'Unknown', parentName });
      }
    }
    return groups;
  }

  async findByTenant(tenantId: string): Promise<GroupData[]> {
    const snapshot = await this.db.collection('groups')
      .where('tenant_id', '==', tenantId)
      .get();
    return snapshot.docs.map(doc => doc.data() as GroupData);
  }

  getDocRef(id: string): admin.firestore.DocumentReference {
    return this.db.collection('groups').doc(id);
  }
}



