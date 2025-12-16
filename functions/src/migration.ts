import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Use existing admin instance if initialized, otherwise init
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

export const migrateToMultiGroup = functions.runWith({
  timeoutSeconds: 540,
  memory: '512MB'
}).https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    functions.logger.log('Starting migration to Multi-Group support...');
    const snapshot = await db.collection('birthdays').get();
    const totalDocs = snapshot.size;
    
    functions.logger.log(`Found ${totalDocs} birthdays to process.`);

    let processed = 0;
    let merged = 0;
    let deleted = 0;
    let updated = 0;

    // Group by unique key to find duplicates
    // Key: tenant_id + first_name + last_name + birth_date_gregorian
    const groups = new Map<string, admin.firestore.QueryDocumentSnapshot[]>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.tenant_id || !data.first_name || !data.last_name || !data.birth_date_gregorian) {
        return; // Skip invalid docs
      }
      const key = `${data.tenant_id}_${data.first_name.trim().toLowerCase()}_${data.last_name.trim().toLowerCase()}_${data.birth_date_gregorian}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(doc);
    });

    functions.logger.log(`Identified ${groups.size} unique people from ${totalDocs} records.`);

    let currentBatch = db.batch();
    let batchCount = 0;
    const BATCH_LIMIT = 400;

    for (const [, docs] of groups.entries()) {
      // Sort to find the best "Master" record
      // Criteria:
      // 1. Has Google Calendar Event ID (to preserve sync connection)
      // 2. Created earliest (Keep original ID)
      docs.sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        
        const aSync = !!aData.googleCalendarEventId;
        const bSync = !!bData.googleCalendarEventId;
        
        if (aSync && !bSync) return -1;
        if (!aSync && bSync) return 1;
        
        const aCreated = aData.created_at || '';
        const bCreated = bData.created_at || '';
        return aCreated.localeCompare(bCreated);
      });

      const masterDoc = docs[0];
      const duplicates = docs.slice(1); // These will be merged into master and deleted
      
      const masterData = masterDoc.data();
      const allGroupIds = new Set<string>();

      // 1. Collect groups from Master
      if (masterData.group_ids && Array.isArray(masterData.group_ids)) {
        masterData.group_ids.forEach((id: string) => allGroupIds.add(id));
      }
      if (masterData.group_id) {
        allGroupIds.add(masterData.group_id);
      }

      // 2. Collect groups from Duplicates
      duplicates.forEach(dup => {
        const dData = dup.data();
        if (dData.group_ids && Array.isArray(dData.group_ids)) {
          dData.group_ids.forEach((id: string) => allGroupIds.add(id));
        }
        if (dData.group_id) {
          allGroupIds.add(dData.group_id);
        }
      });

      const finalGroupIds = Array.from(allGroupIds);
      
      // 3. Determine if update is needed
      // Update if:
      // - There are duplicates to merge
      // - OR master doesn't have group_ids field yet
      // - OR master's group_ids is missing some groups
      const currentMasterGroupIds = masterData.group_ids || [];
      const isStructureOutdated = !masterData.group_ids;
      const isMissingGroups = finalGroupIds.length > currentMasterGroupIds.length;
      const hasDuplicates = duplicates.length > 0;

      if (isStructureOutdated || isMissingGroups || hasDuplicates) {
        currentBatch.update(masterDoc.ref, {
          group_ids: finalGroupIds,
          // Maintain backward compatibility
          group_id: masterData.group_id || finalGroupIds[0] || null, 
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          is_migrated: true,
          migration_timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        batchCount++;
        updated++;
      }

      // 4. Delete duplicates
      duplicates.forEach(dup => {
        currentBatch.delete(dup.ref);
        batchCount++;
        deleted++;
        merged++;
      });

      // Commit batch if full
      if (batchCount >= BATCH_LIMIT) {
        await currentBatch.commit();
        currentBatch = db.batch();
        batchCount = 0;
      }
      
      processed += docs.length;
    }

    // Commit remaining operations
    if (batchCount > 0) {
      await currentBatch.commit();
    }

    functions.logger.log('Migration completed successfully.');

    res.json({
      success: true,
      message: 'Migration completed successfully',
      stats: {
        totalDocsScanned: totalDocs,
        uniquePeople: groups.size,
        processed,
        recordsUpdated: updated,
        duplicatesMerged: merged,
        recordsDeleted: deleted
      }
    });

  } catch (error: any) {
    functions.logger.error('Migration failed:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});








