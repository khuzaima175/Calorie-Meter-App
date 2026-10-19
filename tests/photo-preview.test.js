const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const createLoader=require('./load-production.cjs');
const React=require('react');

function previewHarness(resolveImageUriAsync) {
  let cursor=0,tree; const hooks=[],effects=[];
  const react={...React,
    useState(initial){ const i=cursor++; if(!(i in hooks))hooks[i]={value:typeof initial==='function'?initial():initial}; return [hooks[i].value,v=>{hooks[i].value=typeof v==='function'?v(hooks[i].value):v;}]; },
    useRef(v){ const i=cursor++; return hooks[i]||=( {current:v} ); },
    useEffect(fn,deps){ const i=cursor++,previous=hooks[i]; if(!previous||deps.some((v,n)=>v!==previous.deps[n]))effects.push(()=>{previous?.cleanup?.();hooks[i]={deps,cleanup:fn()};}); },
  };
  const Preview=createLoader({react,'react-native':{View:'View',Image:'Image',Text:'Text',TouchableOpacity:'TouchableOpacity',StyleSheet:{create:s=>s,absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0}}},'@expo/vector-icons':{Ionicons:'Icon'},[path.resolve('src/services/imageService')]:{resolveImageUriAsync}})('src/components/CapturedPhotoPreview.js').default;
  const find=(predicate,node=tree)=>{if(!node||typeof node!=='object')return;if(Array.isArray(node)){for(const item of node){const value=find(predicate,item);if(value)return value;}return;}return predicate(node)?node:find(predicate,node.props?.children ?? null);};
  return {render(props){cursor=0;tree=Preview(props);while(effects.length)effects.shift()();return tree;},find,unmount(){for(const h of hooks)h?.cleanup?.();}};
}
const tick=()=>new Promise(setImmediate);

test('Captured preview has explicit nonzero sizing with native-compatible styles before AI exists',async()=>{
  const h=previewHarness(async uri=>uri),props={uri:'file:///raw.jpg'};
  h.render(props);await tick();const tree=h.render(props),image=h.find(n=>n.type==='Image');
  assert.equal(tree.props.style[0].height,220);
  const fill=image.props.style[0];assert.equal(fill.width,'100%');assert.equal(fill.height,'100%');assert.equal(fill.position,'absolute');
  assert.equal(image.props.source.uri,props.uri);image.props.onLoad();h.render(props);
  assert.ok(h.find(n=>n.type==='Image'&&n.props.source.uri===props.uri));h.unmount();
});

test('Image errors offer reload, and an old URI resolution cannot replace the current photo',async()=>{
  let firstResolve;const first=new Promise(r=>{firstResolve=r;});let calls=0;
  const h=previewHarness(uri=>++calls===1?first:Promise.resolve(uri));
  h.render({uri:'file:///old.jpg'});h.render({uri:'file:///new.jpg'});await tick();h.render({uri:'file:///new.jpg'});
  firstResolve('file:///old.jpg');await tick();h.render({uri:'file:///new.jpg'});
  const image=h.find(n=>n.type==='Image');assert.equal(image.props.source.uri,'file:///new.jpg');image.props.onError();h.render({uri:'file:///new.jpg'});
  const retry=h.find(n=>n.props?.accessibilityLabel==='Retry loading photo');assert.ok(retry);retry.props.onPress();h.render({uri:'file:///new.jpg'});await tick();h.render({uri:'file:///new.jpg'});
  assert.equal(h.find(n=>n.type==='Image').props.source.uri,'file:///new.jpg');h.unmount();
});

test('AI resizing preserves portrait detail and never upscales a small image',()=>{
  const {boundedResize}=createLoader({'react-native':{Image:{}},'expo-image-manipulator':{},[path.resolve('src/services/imageService')]:{},[path.resolve('src/services/databaseService')]:{}})('src/services/imagePreparationService.js');
  assert.deepEqual(boundedResize(4000,3000,896),[{resize:{width:896}}]);
  assert.deepEqual(boundedResize(3000,4000,1600),[{resize:{height:1600}}]);
  assert.deepEqual(boundedResize(320,240,896),[]);assert.throws(()=>boundedResize(0,100,896),/dimensions/);
});

test('Describe fallback bypasses photo decoding while retaining its review image',async()=>{
  const {prepareScanImages}=createLoader({'react-native':{Image:{getSize:()=>{throw new Error('must not decode');}}},'expo-image-manipulator':{},[path.resolve('src/services/imageService')]:{},[path.resolve('src/services/databaseService')]:{}})('src/services/imagePreparationService.js');
  const photos=[{uri:'file:///unreadable.jpg'}],controller=new AbortController();
  const prepared=await prepareScanImages({kind:'text',photos,thumbnailUri:null},controller.signal);
  assert.deepEqual(prepared.photos,photos);assert.deepEqual(prepared.requestPhotos,[]);
  controller.abort();await assert.rejects(prepareScanImages({kind:'text',photos},controller.signal),e=>e.name==='AbortError');
});
