"use strict";
// GroupRepository - גישה לנתוני groups ב-Firestore
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupRepository = void 0;
class GroupRepository {
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const doc = await this.db.collection('groups').doc(id).get();
        if (!doc.exists)
            return null;
        return doc.data();
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        const groupDocs = await Promise.all(ids.map(id => this.db.collection('groups').doc(id).get()));
        const groups = [];
        for (const groupDoc of groupDocs) {
            if (groupDoc.exists) {
                const gData = groupDoc.data();
                let parentName;
                if (gData?.parent_id) {
                    const pDoc = await this.db.collection('groups').doc(gData.parent_id).get();
                    if (pDoc.exists)
                        parentName = pDoc.data()?.name;
                }
                groups.push({ ...gData, name: gData?.name || 'Unknown', parentName });
            }
        }
        return groups;
    }
    async findByTenant(tenantId) {
        const snapshot = await this.db.collection('groups')
            .where('tenant_id', '==', tenantId)
            .get();
        return snapshot.docs.map(doc => doc.data());
    }
    getDocRef(id) {
        return this.db.collection('groups').doc(id);
    }
}
exports.GroupRepository = GroupRepository;
//# sourceMappingURL=GroupRepository.js.map