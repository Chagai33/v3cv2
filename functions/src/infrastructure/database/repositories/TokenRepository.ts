// TokenRepository - גישה לנתוני Google Calendar tokens ב-Firestore

import * as admin from 'firebase-admin';
import { TokenData } from '../../../domain/entities/types';

export class TokenRepository {
  constructor(private db: admin.firestore.Firestore) {}

  async findByUserId(userId: string): Promise<TokenData | null> {
    const doc = await this.db.collection('googleCalendarTokens').doc(userId).get();
    if (!doc.exists) return null;
    return doc.data() as TokenData;
  }

  async save(userId: string, data: Partial<TokenData>): Promise<void> {
    await this.db.collection('googleCalendarTokens').doc(userId).set(data, { merge: true });
  }

  async update(userId: string, data: Partial<TokenData>): Promise<void> {
    await this.db.collection('googleCalendarTokens').doc(userId).update(data);
  }

  async delete(userId: string): Promise<void> {
    await this.db.collection('googleCalendarTokens').doc(userId).delete();
  }

  getDocRef(userId: string): admin.firestore.DocumentReference {
    return this.db.collection('googleCalendarTokens').doc(userId);
  }
}



