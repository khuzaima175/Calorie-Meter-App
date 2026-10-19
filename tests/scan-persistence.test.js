const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const createLoader=require('./load-production.cjs');
const meal={name:'Daal with roti',meal_type:'lunch',portion:'1 plate',calories:420,protein:18,carbs:60,fat:10,fiber:8,sugar:2,sodium:300};
const job={id:'scan-1',kind:'photo',status:'ready',date:'2026-10-01',createdAt:'2026-10-01T12:00:00.000Z',context:{},photos:[{uri:'file:///meal-1.jpg',prepared:true},{uri:'file:///meal-2.jpg',prepared:true}],thumbnailUri:'file:///thumb.jpg',result:{...meal,ingredients:['daal','roti'],dietary_tags:['Vegetarian'],health_tips:'Add salad.',health_score:8}};
const imagePath=path.resolve('src/services/imageService');
function webSetup() {
  const storage=new Map(),removed=[];let fail=false;
  global.window={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(fail)throw new Error('quota');storage.set(k,v);}}};
  const load=()=>createLoader({'react-native':{Platform:{OS:'web'}},[imagePath]:{persistImageAsync:async uri=>uri,deletePersistedImageAsync:async uri=>removed.push(uri)}})('src/services/databaseService.js');
  return {db:load(),load,storage,removed,fail:()=>{fail=true;}};
}
function nativeSetup() {
  const {DatabaseSync}=require('node:sqlite'),sqlite=new DatabaseSync(':memory:');let failReceipts=false,queries=0;
  const adapter={execAsync:async sql=>sqlite.exec(sql),getFirstAsync:async(sql,args=[])=>sqlite.prepare(sql).get(...args),getAllAsync:async(sql,args=[])=>{queries++;return sqlite.prepare(sql).all(...args);},
    runAsync:async(sql,args=[])=>{if(failReceipts&&sql.startsWith('INSERT INTO scan_receipts'))throw new Error('receipt write failed');return sqlite.prepare(sql).run(...args);},
    withExclusiveTransactionAsync:async action=>{sqlite.exec('BEGIN');try{const result=await action(adapter);sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}},};
  const removed=[];
  const db=createLoader({'react-native':{Platform:{OS:'android'}},'expo-sqlite':{openDatabaseAsync:async()=>adapter},[imagePath]:{persistImageAsync:async uri=>uri,deletePersistedImageAsync:async uri=>removed.push(uri)}})('src/services/databaseService.js');
  return {db,sqlite,removed,failReceipts:v=>{failReceipts=v;},queryCount:()=>queries};
}

test('New diaries are empty; demo data is explicit and backup export excludes credentials',async()=>{
  const h=webSetup(),db=h.db;await db.initDatabase();assert.equal((await db.getMealsByDate(db.getTodayString())).length,0);
  await db.updateProfile({custom_api_key:'synthetic-current-key'});
  let backup=JSON.parse(await db.exportAllDataJSON());assert.equal(Object.hasOwn(backup.profile,'custom_api_key'),false);
  backup.profile.custom_api_key='synthetic-imported-key';await db.importAllDataJSON(backup);
  assert.equal((await db.getProfile()).custom_api_key,'synthetic-current-key');
  await db.seedDemoDataIfEmpty();assert.ok((await db.getMealsByDate(db.getTodayString())).length>0);
});

for(const platform of ['web','native'])test(`${platform} scan save is idempotent and preserves all photos, metadata, and original date`,async()=>{
  const h=platform==='web'?webSetup():nativeSetup(),db=h.db;try{
    await db.initDatabase();await db.putScanJob(job);await db.completeScanJob(job,meal);await db.completeScanJob(job,meal);
    const rows=await db.getMealsByDate(job.date);assert.equal(rows.length,1);assert.equal(rows[0].timestamp,job.createdAt);
    assert.deepEqual(rows[0].image_uris,job.photos.map(p=>p.uri));assert.deepEqual(rows[0].ingredients,['daal','roti']);assert.equal(rows[0].health_tips,'Add salad.');assert.equal(rows[0].thumbnail_uri,job.thumbnailUri);
    assert.equal((await db.listScanJobs()).length,0);await db.cleanupUnreferencedImages(job.photos.map(p=>p.uri));assert.equal(h.removed.length,0);
    const backup=JSON.parse(await db.exportAllDataJSON());await db.importAllDataJSON(backup);assert.equal((await db.getMealsByDate(job.date))[0].image_uris.length,2);
  }finally{h.sqlite?.close();}
});

test('Native scan meal and completion receipt roll back together after a failed write',async()=>{
  const h=nativeSetup();try{await h.db.initDatabase();await h.db.putScanJob(job);h.failReceipts(true);
    await assert.rejects(h.db.completeScanJob(job,meal),/receipt write failed/);assert.equal((await h.db.getMealsByDate(job.date)).length,0);assert.equal((await h.db.listScanJobs()).length,1);
    h.failReceipts(false);await h.db.completeScanJob(job,meal);assert.equal((await h.db.getMealsByDate(job.date)).length,1);
  }finally{h.sqlite.close();}
});

test('Hydration from a scan is logged exactly once to the captured diary date',async()=>{
  const h=nativeSetup();try{await h.db.initDatabase();await h.db.putScanJob(job);const water={is_water:true,water_ml:250};
    await h.db.completeScanJob(job,water);await h.db.completeScanJob(job,water);assert.equal((await h.db.getWaterIntakeByDate(job.date)).length,1);assert.equal((await h.db.getMealsByDate(job.date)).length,0);
  }finally{h.sqlite.close();}
});

test('Failed meal writes clean newly persisted images and shared photos survive replacement/deletion',async()=>{
  const failing=webSetup();await failing.db.initDatabase();failing.fail();await assert.rejects(failing.db.insertMeal({...meal,image_uri:'file:///new.jpg'}));assert.ok(failing.removed.includes('file:///new.jpg'));
  const h=webSetup(),db=h.db;await db.initDatabase();const first=await db.insertMeal({...meal,image_uri:'file:///shared.jpg'}),second=await db.insertMeal({...meal,image_uri:'file:///shared.jpg'});
  await db.updateMeal(first,{image_uri:'file:///replacement.jpg'});assert.equal(h.removed.includes('file:///shared.jpg'),false);
  await db.deleteMealById(second);assert.ok(h.removed.includes('file:///shared.jpg'));
});

test('A scan draft owns its images until discard or reset and raw base64 cannot enter job storage',async()=>{
  const h=webSetup(),db=h.db;await db.initDatabase();await db.putScanJob(job);
  await db.cleanupUnreferencedImages(job.photos.map(p=>p.uri));assert.equal(h.removed.length,0);
  await assert.rejects(db.putScanJob({...job,id:'bad',photos:[{uri:'data:image/jpeg;base64,AAAA'}]}),/Save the photo/);
  await db.clearAllLogs();assert.equal((await db.listScanJobs()).length,0);assert.ok(h.removed.includes(job.photos[0].uri));
});

test('Native weekly summary uses three grouped queries and fills missing days',async()=>{
  const h=nativeSetup();try{await h.db.initDatabase();await h.db.insertMeal({...meal,date:job.date});await h.db.addWaterIntake(250,job.date);
    const before=h.queryCount(),summary=await h.db.get7DaySummary('2026-10-03');assert.equal(h.queryCount()-before,3);assert.equal(summary.length,7);
    assert.equal(summary.find(d=>d.date===job.date).calories,420);assert.equal(summary.find(d=>d.date===job.date).waterMl,250);assert.equal(summary.at(-1).calories,0);
  }finally{h.sqlite.close();}
});
