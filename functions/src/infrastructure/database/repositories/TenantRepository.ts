// TenantRepository - גישה לנתוני tenants ב-Firestore

import * as admin from 'firebase-admin';
import { TenantData } from '../../../domain/entities/types';

export class TenantRepository {
  constructor(private db: admin.firestore.Firestore) {}

  async findById(id: string): Promise<TenantData | null> {
    const doc = await this.db.collection('tenants').doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as TenantData;
  }

  async update(id: string, data: Partial<TenantData>): Promise<void> {
    await this.db.collection('tenants').doc(id).update(data);
  }

  getDocRef(id: string): admin.firestore.DocumentReference {
    return this.db.collection('tenants').doc(id);
  }
}



