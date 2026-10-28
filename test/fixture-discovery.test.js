const test=require('node:test'),assert=require('node:assert/strict');const {discoverFixtureContainer}=require('../database/testing/fixture-discovery');
const id='a'.repeat(64);function exec(context='desktop-linux',rows=id){return (_cmd,args)=>args[0]==='context'?context:`${rows}\n`;}
test('discovers exactly one full fixture container',()=>assert.equal(discoverFixtureContainer(exec()),id));
test('rejects invalid context, none, multiple and short IDs',()=>{assert.throws(()=>discoverFixtureContainer(exec('default')));assert.throws(()=>discoverFixtureContainer(exec('desktop-linux','')));assert.throws(()=>discoverFixtureContainer(exec('desktop-linux',`${id}\n${'b'.repeat(64)}`)));assert.throws(()=>discoverFixtureContainer(exec('desktop-linux','abc')));});
