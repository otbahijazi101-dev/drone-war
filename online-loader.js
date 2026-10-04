(()=>{
  const parts=['online.part1.txt','online.part2.txt','online.part3.txt','online.part4.txt','online.part5.txt','online.part6.txt','online.part7.txt'];
  Promise.all(parts.map(path=>fetch('/'+path).then(response=>{
    if(!response.ok)throw new Error(path+' yüklenemedi ('+response.status+')');
    return response.text();
  }))).then(chunks=>{
    new Function(chunks.join(''))();
  }).catch(error=>{
    console.error('Drone War online module failed:',error);
  });
})();
