"use strict";
// BirthdayRepository - גישה לנתוני birthdays ב-Firestore
Object.defineProperty(exports, "__esModule", { value: true });
exports.BirthdayRepository = void 0;
class BirthdayRepository {
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const doc = await this.db.collection('birthdays').doc(id).get();
        if (!doc.exists)
            return null;
        return { id: doc.id, ...doc.data() };
    }
    async findByTenant(tenantId) {
        const snapshot = await this.db.collection('birthdays')
            .where('tenant_id', '==', tenantId)
            .where('archived', '==', false)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    async update(id, data) {
        await this.db.collection('birthdays').doc(id).update(data);
    }
    async delete(id) {
        await this.db.collection('birthdays').doc(id).delete();
    }
    getDocRef(id) {
        return this.db.collection('birthdays').doc(id);
    }
}
exports.BirthdayRepository = BirthdayRepository;
//# sourceMappingURL=BirthdayRepository.js.map