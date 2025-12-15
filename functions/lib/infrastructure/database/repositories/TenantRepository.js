"use strict";
// TenantRepository - גישה לנתוני tenants ב-Firestore
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantRepository = void 0;
class TenantRepository {
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const doc = await this.db.collection('tenants').doc(id).get();
        if (!doc.exists)
            return null;
        return doc.data();
    }
    async update(id, data) {
        await this.db.collection('tenants').doc(id).update(data);
    }
    getDocRef(id) {
        return this.db.collection('tenants').doc(id);
    }
}
exports.TenantRepository = TenantRepository;
//# sourceMappingURL=TenantRepository.js.map