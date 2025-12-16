// BirthdayRepository - גישה לנתוני birthdays ב-Firestore

import * as admin from 'firebase-admin';
import { BirthdayData } from '../../../domain/entities/types';

export class BirthdayRepository {
  constructor(private db: admin.firestore.Firestore) {}

  async findById(id: string): Promise<BirthdayData | null> {
    const doc = await this.db.collection('birthdays').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as BirthdayData;
  }

  async findByTenant(tenantId: string): Promise<BirthdayData[]> {
    const snapshot = await this.db.collection('birthdays')
      .where('tenant_id', '==', tenantId)
      .where('archived', '==', false)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BirthdayData));
  }

  async update(id: string, data: Partial<BirthdayData>): Promise<void> {
    await this.db.collection('birthdays').doc(id).update(data);
  }

  async delete(id: string): Promise<void> {
    await this.db.collection('birthdays').doc(id).delete();
  }

  getDocRef(id: string): admin.firestore.DocumentReference {
    return this.db.collection('birthdays').doc(id);
  }
}



