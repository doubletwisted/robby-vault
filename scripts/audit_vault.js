#!/usr/bin/env node
/*
  audit_vault.js
  - Validates vault.html manifest consistency
  - Checks that each manifest file exists
  - Checks that each thumbnail exists and is above a minimum size

  Usage:
    node scripts/audit_vault.js [--minBytes 12000]
*/

const fs = require('fs');
const path = require('path');

function parseArgs(argv){
  const out = { _: [] };
  for (let i=0;i<argv.length;i++){
    const a = argv[i];
    if(!a.startsWith('--')){ out._.push(a); continue; }
    const k = a.slice(2);
    const v = argv[i+1];
    if(!v || v.startsWith('--')) out[k]=true;
    else { out[k]=v; i++; }
  }
  return out;
}

function readText(p){ return fs.readFileSync(p,'utf8'); }
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function size(p){ try{ return fs.statSync(p).size; } catch { return 0; } }

function locateManifest(html){
  const anchor = 'const items = [';
  const i0 = html.indexOf(anchor);
  if(i0<0) throw new Error('manifest anchor not found');
  const start = i0 + anchor.length;
  const end = html.indexOf('];', start);
  if(end<0) throw new Error('manifest end not found');
  return html.slice(start, end);
}

function parseItems(block){
  const re = /\{\s*file\s*:\s*'([^']+)'\s*,\s*tags\s*:\s*\[([^\]]*)\]\s*\}\s*,?/g;
  const items=[];
  let m;
  while((m=re.exec(block))){
    const file=m[1];
    const tags=m[2].trim() ? m[2].split(',').map(s=>s.trim().replace(/^'|'$/g,'')).filter(Boolean) : [];
    items.push({file,tags});
  }
  return items;
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  // NOTE: jpg size is a weak heuristic. Truly-black thumbs tend to be ~3KB.
  // Set a conservative default and allow override.
  const minBytes=Number(args.minBytes||3500);

  const repoRoot=process.cwd();
  const vaultPath=path.join(repoRoot,'vault.html');
  const thumbsDir=path.join(repoRoot,'thumbs');

  if(!exists(vaultPath)){
    console.error('ERROR: vault.html not found at', vaultPath);
    process.exit(2);
  }

  const html=readText(vaultPath);
  const block=locateManifest(html);
  const items=parseItems(block);

  const seen=new Set();
  const dup=[];
  const missingFiles=[];
  const missingThumbs=[];
  const smallThumbs=[];

  for(const it of items){
    if(seen.has(it.file)) dup.push(it.file);
    seen.add(it.file);

    const fp=path.join(repoRoot,it.file);
    if(!exists(fp)) missingFiles.push(it.file);

    const tp=path.join(thumbsDir, it.file.replace(/\.html$/,'') + '.jpg');
    if(!exists(tp)) missingThumbs.push(path.basename(tp));
    else {
      const sz=size(tp);
      if(sz<minBytes) smallThumbs.push({thumb:path.basename(tp), size:sz});
    }
  }

  const report={
    items: items.length,
    duplicates: dup,
    missingFiles,
    missingThumbs,
    smallThumbs,
    ok: dup.length===0 && missingFiles.length===0 && missingThumbs.length===0 && smallThumbs.length===0,
  };

  console.log(JSON.stringify(report,null,2));
  if(!report.ok) process.exit(1);
}

main();
