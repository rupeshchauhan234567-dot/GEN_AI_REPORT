import axios from 'axios';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:3000',withCredentials:true});
export const dashboard=()=>api.get('/api/hub/dashboard').then(r=>r.data);
export const listItems=(type,q='')=>api.get('/api/hub/items',{params:{type,q,limit:50}}).then(r=>r.data);
export const createItem=data=>api.post('/api/hub/items',data).then(r=>r.data);
export const updateItem=(id,data)=>api.patch(`/api/hub/items/${id}`,data).then(r=>r.data);
export const deleteItem=id=>api.delete(`/api/hub/items/${id}`);
export const generateAI=data=>api.post('/api/hub/ai/generate',data,{timeout:90000}).then(r=>r.data);
export const sendChat=data=>api.post('/api/hub/ai/chat',data,{timeout:90000}).then(r=>r.data);
