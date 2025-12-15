"use strict";
// WishlistRepository - גישה לנתוני wishlist items ב-Firestore
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishlistRepository = void 0;
class WishlistRepository {
    constructor(db) {
        this.db = db;
    }
    async findByBirthdayId(birthdayId) {
        const snapshot = await this.db.collection('wishlist_items')
            .where('birthday_id', '==', birthdayId)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    async create(data) {
        const ref = await this.db.collection('wishlist_items').add(data);
        return ref.id;
    }
    async update(id, data) {
        await this.db.collection('wishlist_items').doc(id).update(data);
    }
    async delete(id) {
        await this.db.collection('wishlist_items').doc(id).delete();
    }
    async findById(id) {
        const doc = await this.db.collection('wishlist_items').doc(id).get();
        if (!doc.exists)
            return null;
        return { id: doc.id, ...doc.data() };
    }
}
exports.WishlistRepository = WishlistRepository;
//# sourceMappingURL=WishlistRepository.js.map