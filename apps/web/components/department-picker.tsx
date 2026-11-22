'use client';

import { useMemo, useState } from 'react';
import { Activity, BarChart3, Briefcase, Building2, Cloud, Code2, Cpu, DollarSign, Globe2, Headphones, Landmark, Layers, Megaphone, Network, Package, Radio, Scale, ShieldCheck, Smartphone, Target, Users, Wifi, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PTCL_DEPARTMENT_CATALOG } from '../lib/departments';
import './department-picker.css';

type Team = { name: string; icon: LucideIcon };
type Group = { id: string; name: string; note: string; icon: LucideIcon; teams: Team[] };
export type DepartmentSelection = { category: string; team: string };

const groupIcons:Record<string,LucideIcon>={commercial:Briefcase,"business-solutions":Building2,technology:Network,"customer-operations":Headphones,corporate:Landmark};
const teamIcons:Record<string,LucideIcon>={"Marketing & Brand":Megaphone,"Customer Value Management (CVM)":Target,"Product Development (PD)":Layers,"Wireless & Mobility Products":Radio,"Devices & Mobile Broadband (MBB)":Smartphone,"Pricing & Commercial Strategy":BarChart3,"Sales & Distribution":Users,"Customer Insights & Analytics":Activity,"Enterprise Sales & Account Management":Users,"Cloud & Data Center":Cloud,"ICT & Managed Services":Cpu,"International & Wholesale":Globe2,"B2B Product Management":Layers,"Network Engineering":Network,"Fixed Access & Fiber":Wifi,"Wireless Network":Radio,"IT & Digital Platforms":Code2,"Cybersecurity & Information Security":ShieldCheck,"Data & Analytics":BarChart3,"Architecture & Service Assurance":Workflow,"Customer Care & Contact Center":Headphones,"Customer Experience":Users,"Service Delivery":Activity,"Field Operations":Network,"Service Assurance":ShieldCheck,"Billing Operations":DollarSign,Finance:BarChart3,"People & Organization (HR)":Users,"Legal & Company Secretariat":Scale,"Regulatory Affairs":Landmark,"Corporate Affairs & Communications":Megaphone,"Internal Audit":ShieldCheck,"Procurement & Supply Chain":Package,"Strategy & Transformation":Workflow,"Revenue Assurance":DollarSign,"Facilities & Administration":Building2};
const groups:Group[]=PTCL_DEPARTMENT_CATALOG.map(group=>({id:group.id,name:group.name,note:group.note,icon:groupIcons[group.id]??Building2,teams:group.teams.map(name=>({name,icon:teamIcons[name]??Layers}))}));

export function DepartmentPicker({value,customDepartments,onChange}:{value:string;customDepartments:string[];onChange:(selection:DepartmentSelection)=>void}){
  const allValues = useMemo(()=>new Set(groups.flatMap(group=>group.teams.flatMap(team=>[`${group.name} / ${team.name}`,team.name]))),[]);
  const custom = useMemo(()=>[...new Set(customDepartments)].filter(item=>item.trim()&&!allValues.has(item)),[allValues,customDepartments]);
  const customGroup:Group|undefined=custom.length?{id:'existing',name:'Other / existing departments',note:'Legacy or admin-added department options',icon:Building2,teams:custom.map(name=>({name,icon:Building2}))}:undefined;
  const options=customGroup?[...groups,customGroup]:groups;
  const [selectedGroup,setSelectedGroup]=useState(()=>options.find(group=>value.startsWith(`${group.name} / `)||group.teams.some(team=>team.name===value))?.id??'commercial');
  const active=options.find(group=>group.id===selectedGroup)??options[0];
  const selectedTeam=active.teams.find(team=>value===`${active.name} / ${team.name}`||value===team.name);
  const GroupIcon=active.icon;
  const TeamIcon=selectedTeam?.icon??active.icon;
  return <div className="department-picker">
    <div className="department-picker-title"><span className="department-icon"><Building2 size={18}/></span><div><h3>Department &amp; team</h3><p>Select your PTCL function, then choose the team you work with.</p></div></div>
    <label className="department-select-field"><span><i>01</i>Department group</span><div className="department-select-wrap"><GroupIcon size={17}/><select aria-label="Department group" value={selectedGroup} onChange={event=>{setSelectedGroup(event.target.value);onChange({category:'',team:''})}}>{options.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</select></div><small>{active.note}</small></label>
    <label className="department-select-field"><span><i>02</i>Department team</span><div className="department-select-wrap"><TeamIcon size={17}/><select aria-label="Department team" value={selectedTeam?(active.id==='existing'?selectedTeam.name:`${active.name} / ${selectedTeam.name}`):''} onChange={event=>{const team=active.teams.find(item=>(active.id==='existing'?item.name:`${active.name} / ${item.name}`)===event.target.value);onChange({category:team?active.name:'',team:team?.name??''})}}><option value="">Select a team</option>{active.teams.map(team=>{const optionValue=active.id==='existing'?team.name:`${active.name} / ${team.name}`;return <option key={optionValue} value={optionValue}>{team.name}</option>})}</select></div></label>
    <p className="department-selection" aria-live="polite">{value?<>Selected department: <strong>{value.replace(' / ',' · ')}</strong></>:'Select a team to continue.'}</p>
  </div>;
}
