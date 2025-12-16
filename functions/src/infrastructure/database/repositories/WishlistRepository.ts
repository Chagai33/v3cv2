// WishlistRepository - גישה לנתוני wishlist items ב-Firestore

import * as admin from 'firebase-admin';
import { WishlistItem } from '../../../domain/entities/types';

export class WishlistRepository {
  constructor(private db: admin.firestore.Firestore) {}

  async findByBirthdayId(birthdayId: string): Promise<WishlistItem[]> {
    const snapshot = await this.db.collection('wishlist_items')
      .where('birthday_id', '==', birthdayId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WishlistItem));
  }

  async create(data: Omit<WishlistItem, 'id'>): Promise<string> {
    const ref = await this.db.collection('wishlist_items').add(data);
    return ref.id;
  }

  async update(id: string, data: Partial<WishlistItem>): Promise<void> {
    await this.db.collection('wishlist_items').doc(id).update(data);
  }

  async delete(id: string): Promise<void> {
    await this.db.collection('wishlist_items').doc(id).delete();
  }

  async findById(id: string): Promise<WishlistItem | null> {
    const doc = await this.db.collection('wishlist_items').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as WishlistItem;
  }
}



