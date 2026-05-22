import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, onMount } from 'solid-js'
import { createColumnHelper } from '@tanstack/solid-table'
import type { ColumnDef } from '@tanstack/solid-table'
import { DataTable } from '../../components/data-table'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { authHeader } from '../../contexts/auth'

export const Route = createFileRoute('/_app/officers')({ component: OfficersPage })
type Officer={id:string;name:string;phoneNumber:string;position:string|null;isActive:boolean}
type Form={name:string;phoneNumber:string;position:string;isActive:boolean}
const col=createColumnHelper<Officer>(); const empty=():Form=>({name:'',phoneNumber:'',position:'',isActive:true})
function OfficersPage(){
  const[open,setOpen]=createSignal(false)
  const[del,setDel]=createSignal<string|null>(null)
  const[edit,setEdit]=createSignal<Officer|null>(null)
  const[form,setForm]=createSignal<Form>(empty())
  const[search,setSearch]=createSignal('')
  const[data,setData]=createSignal<Officer[]>([])
  const[loading,setLoading]=createSignal(true)
  const[saving,setSaving]=createSignal(false)
  const[deleting,setDeleting]=createSignal(false)

  const fetchOfficers=async()=>{const r=await fetch('/api/officers',{headers:authHeader()});if(r.ok)setData(await r.json())}

  onMount(async()=>{try{await fetchOfficers()}finally{setLoading(false)}})

  const save=async(f:Form)=>{
    const id=edit()?.id;setSaving(true)
    try{const r=await fetch(id?`/api/officers/${id}`:'/api/officers',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json',...authHeader()},body:JSON.stringify(f)})
    if(!r.ok)throw new Error('save');await fetchOfficers();close()}finally{setSaving(false)}
  }
  const remove=async(id:string)=>{setDeleting(true)
    try{const r=await fetch(`/api/officers/${id}`,{method:'DELETE',headers:authHeader()});if(!r.ok)throw new Error('delete');await fetchOfficers();setDel(null)}finally{setDeleting(false)}
  }
  const close=()=>{setOpen(false);setEdit(null);setForm(empty())};const startEdit=(o:Officer)=>{setEdit(o);setForm({name:o.name,phoneNumber:o.phoneNumber,position:o.position??'',isActive:o.isActive});setOpen(true)}
  const cols=[col.accessor('name',{header:'Nama'}),col.accessor('phoneNumber',{header:'Nomor WA'}),col.accessor('position',{header:'Jabatan',cell:i=>i.getValue()??'-'}),col.accessor('isActive',{header:'Status',cell:i=><Badge variant={i.getValue()?'success':'secondary'}>{i.getValue()?'Aktif':'Nonaktif'}</Badge>}),col.display({id:'actions',header:'Aksi',cell:i=><div class="flex gap-2"><Button size="sm" variant="outline" onClick={()=>startEdit(i.row.original)}>Edit</Button><Button size="sm" variant="destructive" onClick={()=>setDel(i.row.original.id)}>Hapus</Button></div>})]
  return <div class="space-y-6"><div class="flex justify-between"><h1 class="text-2xl font-bold dark:text-slate-100">Officer Numbers</h1><Button onClick={()=>setOpen(true)}>+ Tambah Officer</Button></div><Card><CardContent class="pt-6"><DataTable data={data()} columns={cols as ColumnDef<Officer, unknown>[]} loading={loading()} globalFilter={search()} onGlobalFilterChange={setSearch}/></CardContent></Card><Dialog open={open()} onClose={close}><DialogContent><DialogHeader><DialogTitle>{edit()?'Edit Officer':'Tambah Officer'}</DialogTitle></DialogHeader><form class="space-y-4" onSubmit={e=>{e.preventDefault();save(form())}}><Input label="Nama *" required value={form().name} onInput={e=>setForm({...form(),name:e.currentTarget.value})}/><Input label="Nomor WA *" required value={form().phoneNumber} onInput={e=>setForm({...form(),phoneNumber:e.currentTarget.value})}/><Input label="Jabatan" value={form().position} onInput={e=>setForm({...form(),position:e.currentTarget.value})}/><label class="flex gap-2 text-sm dark:text-slate-300"><input type="checkbox" checked={form().isActive} onChange={e=>setForm({...form(),isActive:e.currentTarget.checked})}/>Aktif</label><DialogFooter><Button type="button" variant="outline" onClick={close}>Batal</Button><Button type="submit" disabled={saving()}>Simpan</Button></DialogFooter></form></DialogContent></Dialog><Dialog open={!!del()} onClose={()=>setDel(null)}><DialogContent><DialogHeader><DialogTitle>Hapus Officer</DialogTitle></DialogHeader><p class="text-sm dark:text-slate-300">Yakin ingin menghapus officer ini?</p><DialogFooter><Button variant="outline" onClick={()=>setDel(null)}>Batal</Button><Button variant="destructive" disabled={deleting()} onClick={()=>{const id=del();if(id)remove(id)}}>Hapus</Button></DialogFooter></DialogContent></Dialog></div>}
