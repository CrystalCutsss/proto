async function r(t){const a=await crypto.subtle.digest("SHA-256",t);return[...new Uint8Array(a)].map(n=>n.toString(16).padStart(2,"0")).join("")}export{r as s};
