"use client";
import { useState, useMemo, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────
const C = {
  brand:"#00AEEF", brandDk:"#0082C8", brandLt:"#E3F5FD",
  orange:"#F97316", orangeLt:"#FFF1E8",
  bg:"#EFF3F7", surface:"#FFFFFF", surfaceAlt:"#F7FAFC",
  border:"#DDE4EC", borderLt:"#EEF2F6",
  g4:"#94A3B8", g5:"#64748B", g6:"#475569",
  g7:"#334155", g8:"#1E293B", g9:"#0F172A",
  green:"#10B981", greenLt:"#D1FAE5",
  red:"#EF4444",   redLt:"#FEE2E2",
  amber:"#F59E0B", amberLt:"#FEF3C7",
  teal:"#14B8A6",  tealLt:"#CCFBF1",
  purple:"#8B5CF6",
};
const F = "'DM Sans',system-ui,sans-serif";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const MEMBERS = {
  Dev:      {role:"Tech Lead",        color:"#00AEEF",rBg:"#E3F5FD",rC:"#006FA3"},
  Harsh:    {role:"Backend Dev",      color:"#F97316",rBg:"#FFF1E8",rC:"#C05810"},
  Roshan:   {role:"Mobile Dev",       color:"#10B981",rBg:"#D1FAE5",rC:"#0A7A5A"},
  Pradeep:  {role:"Backend Dev",      color:"#8B5CF6",rBg:"#EDE9FE",rC:"#6D3FD6"},
  Diksha:   {role:"Biz Analyst",      color:"#EC4899",rBg:"#FCE7F3",rC:"#BE185D"},
  Vaishnavi:{role:"Frontend Dev",     color:"#F59E0B",rBg:"#FEF3C7",rC:"#B45309"},
  Nikhil:   {role:"Frontend Dev",     color:"#06B6D4",rBg:"#CFFAFE",rC:"#0E7490"},
  Nikita:   {role:"QA Engineer",      color:"#EF4444",rBg:"#FEE2E2",rC:"#B91C1C"},
  Harshal:  {role:"Developer",        color:"#84CC16",rBg:"#F7FEE7",rC:"#4D7C0F"},
  Amit:     {role:"Designer",         color:"#A78BFA",rBg:"#EDE9FE",rC:"#7C3AED"},
};
const gm = n => MEMBERS[(n||"").trim()] || {role:"Member",color:C.brand,rBg:C.brandLt,rC:C.brandDk};
const TC = {Development:C.brand,"Bug Fixing":C.red,QA:C.orange,BA:"#EC4899",KT:C.purple,Deployment:C.green,Designing:"#A78BFA"};
const SC = {
  Completed:   {c:C.green, bg:C.greenLt, dot:"#10B981"},
  "In-progress":{c:C.brand, bg:C.brandLt, dot:C.brand},
  "On-Hold":   {c:C.amber, bg:C.amberLt, dot:C.amber},
};
const SHEET_ID = "1P9-CKI3W2tDRIZAuATQruCqJMNFjLmfX1Z2otB-7aWk";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Sheet1`;

// ─────────────────────────────────────────────
// DATE UTILS  ← FIX: all date logic centralised
// ─────────────────────────────────────────────
// Parse "M/D/YYYY" → local midnight Date (avoids any UTC issues)
const parseTaskDate = s => {
  if (!s) return null;
  const [m,d,y] = s.split("/").map(Number);
  if (!y) return null;
  const dt = new Date(y,m-1,d); dt.setHours(0,0,0,0); return dt;
};
// "YYYY-MM-DD" from <input type=date> → local Date (no UTC shift)
const parseInput = (v, eod=false) => {
  if (!v) return null;
  const [y,m,d] = v.split("-").map(Number);
  const dt = new Date(y,m-1,d);
  dt.setHours(eod?23:0, eod?59:0, eod?59:0, eod?999:0);
  return dt;
};
// Local Date → "YYYY-MM-DD" for input value
const fmtInput = dt => {
  if (!dt) return "";
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
};
// Today's date as "M/D/YYYY" matching task date format
const todayStr = () => { const d=new Date(); return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`; };

function getDateRange(type, cs=null, ce=null) {
  const now = new Date(); now.setHours(0,0,0,0);
  const eod = new Date(); eod.setHours(23,59,59,999);
  if (type==="today")  return { start:new Date(now), end:new Date(eod) };
  if (type==="last7")  { const s=new Date(now); s.setDate(s.getDate()-6);  return {start:s,end:new Date(eod)}; }
  if (type==="last30") { const s=new Date(now); s.setDate(s.getDate()-29); return {start:s,end:new Date(eod)}; }
  if (type==="custom") return { start:cs, end:ce };
  return null;
}
function inRange(dateStr, start, end) {
  const dt = parseTaskDate(dateStr);
  if (!dt||!start||!end) return false;
  return dt>=start && dt<=end;
}
const sortDate = s => parseTaskDate(s)||new Date(0);

// ─────────────────────────────────────────────
// FALLBACK DATA — today's date dynamically injected
// ─────────────────────────────────────────────
const TODAY = todayStr();
const FB = [
  {date:TODAY,  id:0,  task:"Sprint planning & team standup",                            assignee:"Dev",      hours:2,   type:"Development",status:"In-progress"},
  {date:TODAY,  id:1,  task:"Team Discussion + Team Support",                             assignee:"Dev",      hours:6,   type:"Development",status:"In-progress"},
  {date:TODAY,  id:2,  task:"Update product list and get by ID APIs",                     assignee:"Harsh",    hours:2,   type:"Development",status:"In-progress"},
  {date:TODAY,  id:3,  task:"Mobile app - Carbon emission vehicle fuel type integration", assignee:"Roshan",   hours:8,   type:"Development",status:"In-progress"},
  {date:TODAY,  id:4,  task:"Implement Inbound Indent History Table and Scheduler",       assignee:"Pradeep",  hours:8,   type:"Development",status:"In-progress"},
  {date:TODAY,  id:5,  task:"Write scope and use cases for CEAT Inbound",                 assignee:"Diksha",   hours:8,   type:"BA",          status:"In-progress"},
  {date:TODAY,  id:6,  task:"Test Initiate Auction from RFQ flow",                        assignee:"Vaishnavi",hours:2,   type:"QA",          status:"In-progress"},
  {date:TODAY,  id:7,  task:"Multiple Issues in Tiered Allocation",                       assignee:"Roshan",   hours:0.5, type:"Bug Fixing",   status:"In-progress"},
  {date:TODAY,  id:8,  task:"IOS App - Analytics UI Issues",                              assignee:"Roshan",   hours:0.5, type:"Bug Fixing",   status:"In-progress"},
  {date:TODAY,  id:11, task:"Inbound indent create page design and API integration",      assignee:"Nikhil",   hours:8,   type:"Development",status:"In-progress"},
  {date:TODAY,  id:12, task:"Add Inbound Indent Flag in Config",                          assignee:"Harsh",    hours:6,   type:"Development",status:"In-progress"},
  {date:TODAY,  id:13, task:"Design Indent History Tab Screens",                          assignee:"Vaishnavi",hours:6,   type:"Development",status:"In-progress"},
  {date:"3/5/2026",id:14,task:"Team Discussion + M8 Efforts Estimation",         assignee:"Dev",      hours:4,type:"Development",status:"Completed"},
  {date:"3/5/2026",id:15,task:"Updated transporter show API with ALL RFQ data",  assignee:"Harsh",    hours:1,type:"Development",status:"Completed"},
  {date:"3/5/2026",id:16,task:"Internal discussion and efforts estimation for M8",assignee:"Diksha",   hours:8,type:"BA",         status:"Completed"},
  {date:"3/5/2026",id:17,task:"Implement vehicles add functionality in RFQ Mode", assignee:"Vaishnavi",hours:3,type:"Development",status:"Completed"},
  {date:"3/5/2026",id:19,task:"UAT Testing and Deployment for Carbon API",        assignee:"Pradeep",  hours:2,type:"Deployment", status:"Completed"},
  {date:"3/5/2026",id:20,task:"Fixed sidebar menu alignment in Superadmin",       assignee:"Harshal",  hours:4,type:"Development",status:"Completed"},
  {date:"3/5/2026",id:21,task:"Add site type customer dropdown in site onboard",  assignee:"Nikhil",   hours:4,type:"Development",status:"Completed"},
  {date:"3/5/2026",id:22,task:"Customer Table Creation and Onboarding API",       assignee:"Harsh",    hours:3,type:"Development",status:"Completed"},
  {date:"3/5/2026",id:23,task:"Test RFQ Auctions Creation Full Flow on UAT",      assignee:"Vaishnavi",hours:5,type:"Development",status:"Completed"},
  {date:"3/5/2026",id:36,task:"Redis data setup with expiry time",                assignee:"Pradeep",  hours:4,type:"Development",status:"Completed"},
  {date:"3/5/2026",id:37,task:"Verify RFQ Auction full flow after changes",       assignee:"Nikita",   hours:2,type:"QA",         status:"Completed"},
  {date:"3/5/2026",id:38,task:"Checking M7 changes in mobile app",                assignee:"Nikita",   hours:4,type:"QA",         status:"Completed"},
  {date:"3/5/2026",id:39,task:"Contract Auctions responsive Assign Transporters", assignee:"Amit",     hours:1,type:"Designing",  status:"Completed"},
  {date:"3/4/2026",id:41,task:"Call with Taabi Team for Inbound Indent",          assignee:"Dev",      hours:5,type:"Development",status:"Completed"},
  {date:"3/4/2026",id:42,task:"Mobile app - Fix lagging issue in IOS",            assignee:"Roshan",   hours:5,type:"Development",status:"Completed"},
  {date:"3/4/2026",id:43,task:"Implement Lane Wise Transporters Show for RFQ",    assignee:"Vaishnavi",hours:5,type:"Development",status:"Completed"},
  {date:"3/4/2026",id:45,task:"API support for frontend in rfq auction",          assignee:"Harsh",    hours:5,type:"Development",status:"Completed"},
  {date:"3/4/2026",id:46,task:"Transporter and client Management in superadmin",  assignee:"Harshal",  hours:5,type:"Development",status:"Completed"},
  {date:"3/4/2026",id:49,task:"Client Call to Discuss Inbound Feature Requirements",assignee:"Diksha", hours:1,type:"BA",         status:"Completed"},
  {date:"3/4/2026",id:50,task:"Client Call to Discuss Inbound Feature Requirements",assignee:"Nikita", hours:1,type:"QA",         status:"Completed"},
  {date:"3/4/2026",id:57,task:"Enterprise Dashboard Count Mismatch fix",          assignee:"Pradeep",  hours:2,type:"Development",status:"Completed"},
  {date:"2/27/2026",id:59,task:"Kafka-Based Trip Completion Event Publishing",    assignee:"Pradeep",  hours:6,type:"Development",status:"Completed"},
  {date:"2/27/2026",id:61,task:"Update transporter show API per lane wise type",  assignee:"Harsh",    hours:4,type:"Development",status:"Completed"},
  {date:"2/27/2026",id:64,task:"Integrate Lane Wise Transporters Show API",       assignee:"Vaishnavi",hours:5,type:"Development",status:"Completed"},
  {date:"2/27/2026",id:65,task:"Daily Progress Tracking and Team Coordination",   assignee:"Diksha",   hours:8,type:"BA",         status:"Completed"},
  {date:"2/27/2026",id:66,task:"Merge User module branch and resolve conflicts",  assignee:"Nikhil",   hours:6,type:"Development",status:"Completed"},
  {date:"2/27/2026",id:67,task:"Add Transporter and Client Management to Super Admin",assignee:"Harshal",hours:4,type:"Development",status:"Completed"},
  {date:"2/27/2026",id:68,task:"Checking M7 changes in android mobile app",      assignee:"Nikita",   hours:4,type:"QA",         status:"Completed"},
  {date:"2/27/2026",id:69,task:"Mobile app - Manage app architecture changes",   assignee:"Roshan",   hours:8,type:"Development",status:"Completed"},
  {date:"2/26/2026",id:70,task:"Mobile app - Upgrade new version package",       assignee:"Roshan",   hours:8,type:"Development",status:"Completed"},
  {date:"2/26/2026",id:71,task:"Update Lanes in RFQ & Normal Auction Creation",  assignee:"Harsh",    hours:8,type:"Development",status:"Completed"},
  {date:"2/26/2026",id:72,task:"Design & Implement Lane Wise Assign Transporters",assignee:"Vaishnavi",hours:8,type:"Development",status:"Completed"},
  {date:"2/26/2026",id:73,task:"Add vehicle fuel type while creating driver",    assignee:"Nikhil",   hours:4,type:"Development",status:"Completed"},
  {date:"2/26/2026",id:74,task:"Live Deployment of Jobs Only",                   assignee:"Dev",      hours:4,type:"Deployment", status:"Completed"},
  {date:"2/26/2026",id:75,task:"Coordinate Client Requirement Discussions",      assignee:"Diksha",   hours:8,type:"BA",         status:"Completed"},
  {date:"2/26/2026",id:78,task:"Checking M7 changes in mobile app",              assignee:"Nikita",   hours:6,type:"QA",         status:"Completed"},
  {date:"2/25/2026",id:80,task:"Create trip share email API with email template",assignee:"Harsh",    hours:5,type:"Development",status:"Completed"},
  {date:"2/25/2026",id:81,task:"Mobile app - Deploy in IOS testflight UAT server",assignee:"Roshan",  hours:4,type:"Deployment", status:"Completed"},
  {date:"2/25/2026",id:82,task:"Test Contract Auctions with CR points",          assignee:"Vaishnavi",hours:8,type:"QA",         status:"Completed"},
  {date:"2/25/2026",id:85,task:"Integrate API for trip share link and its design",assignee:"Nikhil",  hours:4,type:"Development",status:"Completed"},
  {date:"2/25/2026",id:87,task:"Track Feedback Execution and Client Discussions",assignee:"Diksha",   hours:8,type:"BA",         status:"Completed"},
  {date:"2/25/2026",id:88,task:"Update analytics raw data download APIs",        assignee:"Harsh",    hours:3,type:"Development",status:"Completed"},
  {date:"2/24/2026",id:91,task:"Test Initiate Auction Flow with Fetch From RFQ", assignee:"Vaishnavi",hours:8,type:"Development",status:"Completed"},
  {date:"2/24/2026",id:95,task:"RFQ Auction: Testing and deployment on UAT",     assignee:"Pradeep",  hours:6,type:"Development",status:"Completed"},
  {date:"2/24/2026",id:96,task:"Shared trip to customer page API integration",   assignee:"Nikhil",   hours:8,type:"Development",status:"Completed"},
  {date:"2/24/2026",id:97,task:"Create route summary APIs for trip sharing",     assignee:"Harsh",    hours:4,type:"Development",status:"Completed"},
  {date:"2/24/2026",id:98,task:"Write scope and use cases for customer shipment tracking",assignee:"Diksha",hours:8,type:"BA",   status:"Completed"},
  {date:"2/23/2026",id:107,task:"Implement Initiate Auction Flow with UI & Filters",assignee:"Vaishnavi",hours:16,type:"Development",status:"Completed"},
  {date:"2/23/2026",id:108,task:"Mobile app - IOS design changes for devices",   assignee:"Roshan",   hours:8,type:"Development",status:"Completed"},
  {date:"2/23/2026",id:109,task:"New Feature Analysis",                           assignee:"Dev",      hours:7,type:"Development",status:"Completed"},
  {date:"2/23/2026",id:110,task:"RFQ Auction: Enhanced RFQ-to-Auction creation flow",assignee:"Pradeep",hours:6,type:"Development",status:"Completed"},
  {date:"2/23/2026",id:114,task:"Design page for share trip modal",               assignee:"Nikhil",   hours:6,type:"Development",status:"Completed"},
  {date:"2/23/2026",id:115,task:"Update auction create flow for transporter",     assignee:"Harsh",    hours:3,type:"Development",status:"Completed"},
  {date:"2/23/2026",id:116,task:"Create API for trip details share option",       assignee:"Harsh",    hours:3,type:"Development",status:"Completed"},
  {date:"2/23/2026",id:122,task:"Client call on Customer Shipment Tracking",      assignee:"Diksha",   hours:1,type:"KT",         status:"Completed"},
  {date:"2/20/2026",id:129,task:"Updation in SOB and Tiered allocation flow",     assignee:"Pradeep",  hours:8,type:"Development",status:"Completed"},
  {date:"2/20/2026",id:132,task:"Add auto rules screen changes and ranking bids", assignee:"Nikhil",   hours:6,type:"Development",status:"Completed"},
  {date:"2/20/2026",id:133,task:"Mobile app - IOS dashboard tab changes",         assignee:"Roshan",   hours:8,type:"Development",status:"Completed"},
  {date:"2/20/2026",id:135,task:"Update the quotation save flow for child acceptance",assignee:"Harsh",hours:4,type:"Development",status:"Completed"},
  {date:"2/20/2026",id:137,task:"Daily Progress Tracking and Team Coordination",  assignee:"Diksha",   hours:8,type:"BA",         status:"Completed"},
  {date:"2/19/2026",id:147,task:"Update listing page status at transporter side", assignee:"Pradeep",  hours:6,type:"Development",status:"Completed"},
  {date:"2/19/2026",id:148,task:"UAT Suggestion & Feedback Checking",             assignee:"Dev",      hours:8,type:"Development",status:"Completed"},
  {date:"2/19/2026",id:149,task:"Add RFQ updations for initiate auction API",     assignee:"Harsh",    hours:4,type:"Development",status:"Completed"},
  {date:"2/19/2026",id:154,task:"Design UI for Cancel Participation in Contract Auctions",assignee:"Vaishnavi",hours:2,type:"Development",status:"Completed"},
  {date:"2/19/2026",id:155,task:"Design UI for Configuration wise Validations",   assignee:"Vaishnavi",hours:3,type:"Development",status:"Completed"},
  {date:"2/19/2026",id:159,task:"Mobile app - Implement code per EAS setup",      assignee:"Roshan",   hours:6,type:"Development",status:"Completed"},
  {date:"2/19/2026",id:160,task:"Verify correct mail received to Enterprise user",assignee:"Nikita",   hours:4,type:"QA",         status:"Completed"},
  {date:"2/18/2026",id:162,task:"Internal Team Discussion",                        assignee:"Dev",      hours:5,type:"Development",status:"Completed"},
  {date:"2/18/2026",id:163,task:"Mobile app - Node version issue and UI mismatch",assignee:"Roshan",   hours:8,type:"Development",status:"Completed"},
  {date:"2/18/2026",id:166,task:"Updation in SOB and Tiered allocation flow",     assignee:"Pradeep",  hours:4,type:"Development",status:"Completed"},
  {date:"2/18/2026",id:168,task:"Keep track on feedback and client discussion",   assignee:"Diksha",   hours:6,type:"BA",         status:"Completed"},
  {date:"2/18/2026",id:173,task:"Show NA when data is not available in Contract Auction",assignee:"Harshal",hours:2,type:"Development",status:"Completed"},
  {date:"2/18/2026",id:174,task:"Design Modal & Implement Step 1 of Initiate Auction",assignee:"Vaishnavi",hours:5,type:"Development",status:"Completed"},
  {date:"2/18/2026",id:175,task:"Auction bidding screen design per new figma",    assignee:"Nikhil",   hours:2,type:"Development",status:"Completed"},
  {date:"2/17/2026",id:184,task:"Team Discussion + Demo suggested points",        assignee:"Dev",      hours:8,type:"Development",status:"Completed"},
  {date:"2/17/2026",id:185,task:"Updation in SOB and Tiered allocation flow",     assignee:"Pradeep",  hours:8,type:"Development",status:"On-Hold"},
  {date:"2/17/2026",id:186,task:"RFQ Auction: extension flow lane wise testing",  assignee:"Harsh",    hours:4,type:"Development",status:"Completed"},
  {date:"2/17/2026",id:187,task:"Implement Save Draft Validation Suggestions",    assignee:"Vaishnavi",hours:6,type:"Development",status:"Completed"},
  {date:"2/17/2026",id:188,task:"Show NA instead of dash (Draft section)",        assignee:"Harshal",  hours:2,type:"Development",status:"Completed"},
  {date:"2/17/2026",id:189,task:"Implement M7 suggestion points",                 assignee:"Nikhil",   hours:6,type:"Development",status:"Completed"},
  {date:"2/17/2026",id:190,task:"Mobile app - Implement expo EAS update",         assignee:"Roshan",   hours:8,type:"Development",status:"Completed"},
  {date:"2/17/2026",id:191,task:"Maintain record of suggestions from client",     assignee:"Diksha",   hours:8,type:"BA",         status:"Completed"},
  {date:"2/17/2026",id:192,task:"Responsive design Transport Contract Auction",   assignee:"Amit",     hours:6,type:"Designing",  status:"Completed"},
  {date:"2/17/2026",id:193,task:"Add transporter cancel logic with re-ranking",   assignee:"Harsh",    hours:4,type:"Development",status:"Completed"},
  {date:"2/16/2026",id:200,task:"Auto Trip Closer – Gate-In/Gate-Out Update",     assignee:"Pradeep",  hours:6,type:"Development",status:"Completed"},
  {date:"2/16/2026",id:201,task:"Mobile app - EAS auto update configuration",     assignee:"Roshan",   hours:8,type:"Deployment", status:"Completed"},
  {date:"2/16/2026",id:202,task:"Add email configuration for all auction emails", assignee:"Harsh",    hours:8,type:"Development",status:"Completed"},
  {date:"2/16/2026",id:203,task:"Test Milestone 7 Features on UAT",               assignee:"Vaishnavi",hours:8,type:"QA",         status:"Completed"},
  {date:"2/16/2026",id:204,task:"Module Testing + Patch Deployment on UAT",       assignee:"Dev",      hours:7,type:"Development",status:"Completed"},
  {date:"2/16/2026",id:205,task:"Test Milestone 7 Features on UAT",               assignee:"Nikhil",   hours:5,type:"QA",         status:"Completed"},
  {date:"2/16/2026",id:208,task:"Ensure daily tracking of TMS activities",        assignee:"Diksha",   hours:6,type:"BA",         status:"Completed"},
  {date:"2/16/2026",id:222,task:"Responsive design Enterprise Contract Auction",  assignee:"Amit",     hours:5,type:"Designing",  status:"Completed"},
  {date:"2/13/2026",id:223,task:"Deploy application in play store and app store", assignee:"Roshan",   hours:6,type:"Deployment", status:"Completed"},
  {date:"2/13/2026",id:224,task:"Checking TAT calculation issue",                 assignee:"Pradeep",  hours:6,type:"Development",status:"Completed"},
  {date:"2/13/2026",id:225,task:"Module Testing + Demo to Taabi Team",            assignee:"Dev",      hours:8,type:"Development",status:"Completed"},
  {date:"2/13/2026",id:247,task:"Project Documentation & Tracking",               assignee:"Diksha",   hours:8,type:"BA",         status:"Completed"},
  {date:"2/12/2026",id:249,task:"Build Reports for Raw data for CEAT trips",      assignee:"Dev",      hours:8,type:"Development",status:"Completed"},
  {date:"2/12/2026",id:250,task:"Mobile app - Implement fixed font size",         assignee:"Roshan",   hours:8,type:"Development",status:"Completed"},
  {date:"2/9/2026", id:329,task:"Azure Redis Service Configuration Changes",      assignee:"Dev",      hours:8,type:"Development",status:"Completed"},
  {date:"2/6/2026", id:343,task:"Azure Redis Connection setup",                   assignee:"Dev",      hours:8,type:"Development",status:"Completed"},
  {date:"2/5/2026", id:355,task:"Team Discussion + Module Testing",               assignee:"Dev",      hours:8,type:"Development",status:"Completed"},
  {date:"2/4/2026", id:381,task:"UI Changes Review + Team Discussion",            assignee:"Dev",      hours:8,type:"Development",status:"Completed"},
  {date:"2/3/2026", id:407,task:"Team Discussion + Call with Client",             assignee:"Dev",      hours:8,type:"Development",status:"Completed"},
  {date:"2/2/2026", id:415,task:"Team Discussion + Team Support",                 assignee:"Dev",      hours:8,type:"Development",status:"Completed"},
];

// ─────────────────────────────────────────────
// PARSE SHEET
// ─────────────────────────────────────────────
function parseSheet(raw) {
  try {
    const j = JSON.parse(raw.replace(/^[^{]*/,"").replace(/[^}]*$/,""));
    return j.table.rows.slice(1).map((row,idx) => {
      const c=row.c||[], g=i=>c[i]?.v??c[i]?.f??"";
      let dv=g(0), ds="";
      if (dv && String(dv).startsWith("Date(")) {
        const p=String(dv).replace("Date(","").replace(")","").split(",");
        const d=new Date(+p[0],+p[1],+p[2]);
        ds=`${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
      } else if (dv) ds=String(dv);
      const task=String(g(2)).trim(), assignee=String(g(3)).trim();
      if (!task||task==="Task"||task==="undefined") return null;
      return {id:g(1)||idx,date:ds,task,assignee,hours:parseFloat(g(4))||0,type:String(g(5)).trim()||"Development",status:String(g(6)).trim()||"In-progress"};
    }).filter(Boolean);
  } catch { return []; }
}

// ─────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────
function Av({name,size=32}){
  const m=gm(name);
  return <div style={{width:size,height:size,borderRadius:"50%",background:m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.4,fontWeight:700,color:"#fff",flexShrink:0,fontFamily:F}}>{(name||"?")[0].toUpperCase()}</div>;
}
function RolePill({name,sx={}}){
  const m=gm(name);
  return <span style={{display:"inline-block",padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:600,background:m.rBg,color:m.rC,whiteSpace:"nowrap",fontFamily:F,...sx}}>{m.role}</span>;
}
function TBadge({label}){
  const c=TC[label]||C.g4;
  return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,color:c,background:`${c}18`,border:`1px solid ${c}28`,whiteSpace:"nowrap",fontFamily:F}}>{label}</span>;
}
function SBadge({label}){
  const s=SC[label]||{c:C.g4,bg:"#f1f5f9",dot:C.g4};
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:600,color:s.c,background:s.bg,whiteSpace:"nowrap",fontFamily:F}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:s.dot,display:"inline-block",flexShrink:0}}/>
    {label}
  </span>;
}
function KPI({icon,label,value,sub,color,bg}){
  return <div style={{background:C.surface,borderRadius:16,padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",borderTop:`3px solid ${color}`,minWidth:0}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
      <div style={{width:34,height:34,borderRadius:9,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{icon}</div>
      <span style={{fontSize:10,color:C.g5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:F}}>{label}</span>
    </div>
    <div style={{fontSize:26,fontWeight:800,color:C.g9,lineHeight:1,fontFamily:F,letterSpacing:"-0.5px"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:C.g4,marginTop:4,fontFamily:F}}>{sub}</div>}
  </div>;
}
function Card({children,sx={}}){
  return <div style={{background:C.surface,borderRadius:16,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",border:`1px solid ${C.borderLt}`,...sx}}>{children}</div>;
}
function CardHead({title,right}){
  return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",borderBottom:`1px solid ${C.borderLt}`,flexWrap:"wrap",gap:8}}>
    <span style={{fontWeight:700,fontSize:14,color:C.g8,fontFamily:F}}>{title}</span>
    {right&&<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>{right}</div>}
  </div>;
}
function Sel({value,onChange,opts,minW=100}){
  return <select value={value} onChange={e=>onChange(e.target.value)} style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 26px 6px 9px",fontSize:12,color:C.g7,outline:"none",cursor:"pointer",appearance:"none",fontFamily:F,fontWeight:500,minWidth:minW,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394A3B8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 7px center"}}>
    {opts.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}
  </select>;
}
function Search({value,onChange}){
  return <div style={{position:"relative",flex:"1 1 160px",minWidth:130}}>
    <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:C.g4,fontSize:13,pointerEvents:"none"}}>⌕</span>
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder="Search tasks or member…" style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px 7px 27px",fontSize:13,color:C.g7,outline:"none",fontFamily:F,background:C.surfaceAlt}}/>
  </div>;
}

// Segmented date filter pill row
function DatePills({value,onChange,cs,ce,setCs,setCe}){
  const pills=[{id:"today",l:"Today"},{id:"last7",l:"7 Days"},{id:"last30",l:"30 Days"},{id:"custom",l:"Custom"}];
  return <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
    <div style={{display:"flex",background:C.surfaceAlt,borderRadius:10,padding:3,gap:2,border:`1px solid ${C.border}`}}>
      {pills.map(p=>{
        const on=value===p.id;
        return <button key={p.id} onClick={()=>onChange(p.id)} style={{padding:"5px 11px",borderRadius:7,border:"none",cursor:"pointer",background:on?C.brand:"transparent",color:on?"#fff":C.g6,fontSize:12,fontWeight:600,fontFamily:F,transition:"all 0.12s",whiteSpace:"nowrap"}}>{p.l}</button>;
      })}
    </div>
    {value==="custom"&&<div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
      <input type="date" value={fmtInput(cs)} onChange={e=>setCs(parseInput(e.target.value,false))} style={{padding:"5px 8px",borderRadius:7,border:`1px solid ${C.border}`,fontFamily:F,fontSize:12,color:C.g7,background:C.surface,outline:"none"}}/>
      <span style={{color:C.g4,fontSize:11}}>→</span>
      <input type="date" value={fmtInput(ce)} onChange={e=>setCe(parseInput(e.target.value,true))} style={{padding:"5px 8px",borderRadius:7,border:`1px solid ${C.border}`,fontFamily:F,fontSize:12,color:C.g7,background:C.surface,outline:"none"}}/>
    </div>}
  </div>;
}

// Mini date pills for chart headers
function MiniDatePills({filt,setFilt}){
  const pills=[{id:null,l:"All"},{id:"today",l:"Today"},{id:"last7",l:"7d"},{id:"last30",l:"30d"},{id:"custom",l:"…"}];
  const [open,setOpen]=useState(false);
  const hasCustom=filt.cs||filt.ce;
  const activeId=hasCustom?"custom":filt.ft;
  return <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
    <div style={{display:"flex",background:C.surfaceAlt,borderRadius:8,padding:2,gap:1,border:`1px solid ${C.border}`}}>
      {pills.map(p=>{
        const on=p.id==="custom"?hasCustom||open:activeId===p.id&&!hasCustom;
        return <button key={String(p.id)} onClick={()=>{
          if(p.id==="custom"){setOpen(o=>!o);}
          else{setFilt({...filt,ft:p.id,cs:null,ce:null});setOpen(false);}
        }} style={{padding:"3px 8px",borderRadius:6,border:"none",cursor:"pointer",background:on?C.brand:"transparent",color:on?"#fff":C.g5,fontSize:11,fontWeight:600,fontFamily:F,transition:"all 0.12s"}}>{p.l}</button>;
      })}
    </div>
    {(open||hasCustom)&&<div style={{display:"flex",gap:4,alignItems:"center"}}>
      <input type="date" value={fmtInput(filt.cs)} onChange={e=>setFilt({...filt,cs:parseInput(e.target.value,false)})} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${C.border}`,fontFamily:F,fontSize:11,color:C.g7,outline:"none"}}/>
      <span style={{color:C.g4,fontSize:10}}>–</span>
      <input type="date" value={fmtInput(filt.ce)} onChange={e=>setFilt({...filt,ce:parseInput(e.target.value,true)})} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${C.border}`,fontFamily:F,fontSize:11,color:C.g7,outline:"none"}}/>
    </div>}
  </div>;
}

function TrendBars({data,h=80}){
  if(!data.length) return <div style={{height:h+26,display:"flex",alignItems:"center",justifyContent:"center",color:C.g4,fontSize:12,fontFamily:F}}>No data for this range</div>;
  const max=Math.max(...data.map(d=>d.v),1);
  const bw=20,gap=5,tw=Math.max((bw+gap)*data.length,280);
  return <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
    <svg width={tw} height={h+28} style={{display:"block",minWidth:"100%"}}>
      {data.map((d,i)=>{
        const bh=Math.max((d.v/max)*(h-4),3),x=i*(bw+gap),y=h-bh;
        return <g key={i}>
          <rect x={x} y={y} width={bw} height={bh} rx={4} fill={C.brand} opacity={0.85}/>
          <text x={x+bw/2} y={h+20} textAnchor="middle" fill={C.g4} fontSize={9} fontFamily="DM Sans,sans-serif">{d.l}</text>
          <title>{d.fl}: {d.v}h</title>
        </g>;
      })}
    </svg>
  </div>;
}

function Donut({segs,size=104}){
  const tot=segs.reduce((s,d)=>s+(d.v||0),0);
  if(!tot) return <div style={{width:size,height:size,borderRadius:"50%",background:C.surfaceAlt,border:`2px dashed ${C.border}`}}/>;
  let cum=0;const r=38,cx=size/2,cy=size/2;
  const paths=segs.filter(d=>d.v>0).map(d=>{
    const p=d.v/tot,a0=cum*2*Math.PI-Math.PI/2;cum+=p;const a1=cum*2*Math.PI-Math.PI/2;
    const x1=cx+r*Math.cos(a0),y1=cy+r*Math.sin(a0),x2=cx+r*Math.cos(a1),y2=cy+r*Math.sin(a1);
    return{...d,path:`M${cx},${cy} L${x1},${y1} A${r},${r},0,${p>0.5?1:0},1,${x2},${y2}Z`};
  });
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    {paths.map((s,i)=><path key={i} d={s.path} fill={s.c} opacity={0.9}/>)}
    <circle cx={cx} cy={cy} r={23} fill={C.surface}/>
    <text x={cx} y={cy+4} textAnchor="middle" fill={C.g8} fontSize={12} fontWeight={700} fontFamily="DM Sans,sans-serif">{tot}</text>
  </svg>;
}

// ─────────────────────────────────────────────
// APPLY CHART FILTER HELPER
// ─────────────────────────────────────────────
function applyChartFilt(arr, filt) {
  let out = arr;
  if (filt.member && filt.member!=="All") out=out.filter(r=>r.assignee===filt.member);
  if (filt.type   && filt.type!=="All")   out=out.filter(r=>r.type===filt.type);
  if (filt.cs || filt.ce) {
    out=out.filter(r=>{const dt=parseTaskDate(r.date);return dt&&(!filt.cs||dt>=filt.cs)&&(!filt.ce||dt<=filt.ce);});
  } else if (filt.ft) {
    const range = getDateRange(filt.ft);
    if (range) out=out.filter(r=>inRange(r.date,range.start,range.end));
  }
  return out;
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App(){
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);

  const [tab,setTab]=useState("overview");
  const [data,setData]=useState(FB);
  const [loading,setLoading]=useState(true);
  const [lastSync,setLastSync]=useState(null);

  // Global filters
  const [fM,setFM]=useState("All");
  const [fT,setFT]=useState("All");
  const [fS,setFS]=useState("All");
  const [fR,setFR]=useState("All");
  const [q,setQ]=useState("");
  const [df,setDf]=useState("last30");  // date filter type
  const [cs,setCs]=useState(null);       // custom start
  const [ce,setCe]=useState(null);       // custom end

  // Tab-specific
  const [day,setDay]=useState("latest");
  const [ms,setMs]=useState("hours");
  const [tf,setTf]=useState("All");

  // Chart filters: {ft, cs, ce, member?, type?}
  const [tF,setTF]=useState({ft:null,cs:null,ce:null,member:"All"});
  const [hF,setHF]=useState({ft:null,cs:null,ce:null,type:"All"});
  const [yF,setYF]=useState({ft:null,cs:null,ce:null,member:"All"});

  const fetch_=useCallback(async()=>{
    setLoading(true);
    try{const r=await fetch(SHEET_URL);const t=await r.text();const p=parseSheet(t);if(p.length>0)setData(p);setLastSync(new Date());}catch{}
    setLoading(false);
  },[]);
  useEffect(()=>{fetch_();const iv=setInterval(fetch_,3*60*60*1000);return()=>clearInterval(iv);},[fetch_]);

  const allDates  =useMemo(()=>[...new Set(data.filter(r=>r.date).map(r=>r.date))].sort((a,b)=>sortDate(b)-sortDate(a)),[data]);
  const allMembers=useMemo(()=>[...new Set(data.map(r=>r.assignee))].filter(Boolean).sort(),[data]);
  const allTypes  =useMemo(()=>[...new Set(data.map(r=>r.type))].filter(Boolean).sort(),[data]);
  const allRoles  =useMemo(()=>[...new Set(allMembers.map(m=>gm(m).role))].sort(),[allMembers]);
  const latestD   =allDates[0]||"";
  const resolvedD =day==="latest"?latestD:day;
  const hasF      =fM!=="All"||fT!=="All"||fS!=="All"||fR!=="All"||q||df!=="last30";
  const clearF    =()=>{setFM("All");setFT("All");setFS("All");setFR("All");setQ("");setDf("last30");setCs(null);setCe(null);};

  // Global date range
  const dateRange=useMemo(()=>getDateRange(df,cs,ce),[df,cs,ce]);

  // Global filtered tasks
  const filtered=useMemo(()=>data.filter(r=>{
    if(fM!=="All"&&r.assignee!==fM)return false;
    if(fT!=="All"&&r.type!==fT)return false;
    if(fS!=="All"&&r.status!==fS)return false;
    if(fR!=="All"&&gm(r.assignee).role!==fR)return false;
    if(q&&!r.task.toLowerCase().includes(q.toLowerCase())&&!r.assignee.toLowerCase().includes(q.toLowerCase()))return false;
    if(dateRange&&!inRange(r.date,dateRange.start,dateRange.end))return false;
    return true;
  }),[data,fM,fT,fS,fR,q,dateRange]);

  const totH =filtered.reduce((s,r)=>s+(r.hours||0),0);
  const compl=filtered.filter(r=>r.status==="Completed").length;
  const inP  =filtered.filter(r=>r.status==="In-progress").length;
  const bugs =filtered.filter(r=>r.type==="Bug Fixing").length;

  // Chart data (use full dataset, apply per-chart filter)
  const trendData=useMemo(()=>{
    const arr=applyChartFilt(data,tF);
    const m={};arr.filter(r=>r.date).forEach(r=>{m[r.date]=(m[r.date]||0)+(r.hours||0);});
    return Object.entries(m).sort((a,b)=>sortDate(a[0])-sortDate(b[0])).slice(-16).map(([d,v])=>({l:d.slice(0,-5),fl:d,v}));
  },[data,tF]);

  const hoursData=useMemo(()=>{
    const arr=applyChartFilt(data,hF);
    const m={};arr.forEach(r=>{if(!m[r.assignee])m[r.assignee]={n:r.assignee,h:0,t:0};m[r.assignee].h+=r.hours||0;m[r.assignee].t++;});
    return Object.values(m).sort((a,b)=>b.h-a.h);
  },[data,hF]);
  const maxH=hoursData[0]?.h||1;

  const typeData=useMemo(()=>{
    const arr=applyChartFilt(data,yF);
    const m={};arr.forEach(r=>{m[r.type]=(m[r.type]||0)+(r.hours||0);});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[data,yF]);
  const typeDonut=useMemo(()=>{
    const hm=Object.fromEntries(typeData);
    return allTypes.map(t=>({l:t,c:TC[t]||C.g4,v:hm[t]||0}));
  },[typeData,allTypes]);

  const mStats=useMemo(()=>{
    const m={};data.forEach(r=>{if(!m[r.assignee])m[r.assignee]={n:r.assignee,h:0,t:0};m[r.assignee].h+=r.hours||0;m[r.assignee].t++;});
    return Object.values(m).sort((a,b)=>ms==="hours"?b.h-a.h:b.t-a.t);
  },[data,ms]);

  const sDonut=[
    {l:"Completed",  c:C.green,v:filtered.filter(r=>r.status==="Completed").length},
    {l:"In-progress",c:C.brand,v:filtered.filter(r=>r.status==="In-progress").length},
    {l:"On-Hold",    c:C.amber,v:filtered.filter(r=>r.status==="On-Hold").length},
  ];

  const dayTasks=useMemo(()=>data.filter(r=>r.date===resolvedD),[data,resolvedD]);
  const dayByM  =useMemo(()=>{const m={};dayTasks.forEach(r=>{if(!m[r.assignee])m[r.assignee]=[];m[r.assignee].push(r);});return Object.entries(m).sort((a,b)=>b[1].reduce((s,r)=>s+r.hours,0)-a[1].reduce((s,r)=>s+r.hours,0));},[dayTasks]);
  const teamMems=useMemo(()=>tf==="All"?allMembers:allMembers.filter(n=>gm(n).role===tf),[allMembers,tf]);

  const TABS=[{id:"overview",icon:"⊞",l:"Overview"},{id:"daily",icon:"☀",l:"Daily"},{id:"team",icon:"◉",l:"Team"},{id:"tasks",icon:"≡",l:"Tasks"}];

  if(!mounted) return null;

  // Helper: today badge for Daily tab header
  const isToday = resolvedD===TODAY;

  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,color:C.g9}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet"/>
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}
      ::-webkit-scrollbar{width:3px;height:3px;}
      ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
      @keyframes spin{to{transform:rotate(360deg);}}.spin{animation:spin .9s linear infinite;display:inline-block;}
      .d-desk{display:flex!important;}.d-mob{display:none!important;}
      .g2{display:grid!important;grid-template-columns:1fr 1fr;}
      .g3{display:grid!important;grid-template-columns:1fr 1fr 1fr;}
      .g4c{display:grid!important;grid-template-columns:repeat(4,1fr);}
      .hs{display:none!important;}
      @media(max-width:640px){
        .d-desk{display:none!important;}.d-mob{display:flex!important;}
        .g2{grid-template-columns:1fr!important;}
        .g3{grid-template-columns:1fr 1fr!important;}
        .g4c{grid-template-columns:1fr 1fr!important;}
        .hs{display:block!important;}
        .hd{display:none!important;}
        main{padding:12px 12px 70px!important;}
      }
    `}</style>

    {/* ── HEADER ── */}
    <header style={{background:C.surface,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:200,boxShadow:"0 1px 0 rgba(0,0,0,0.04)"}}>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,gap:12}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${C.brand},${C.brandDk})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:13,color:"#fff",fontWeight:800,lineHeight:1}}>T</span>
          </div>
          <div style={{lineHeight:1.1}}>
            <span style={{fontWeight:800,fontSize:14,color:C.g9,letterSpacing:"-0.3px"}}>Taabi <span style={{color:C.brand}}>TMS</span></span>
            <div style={{fontSize:9,color:C.g4,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>Team Tracker</div>
          </div>
        </div>

        {/* Desktop tabs */}
        <nav className="d-desk" style={{height:"100%",alignItems:"flex-end",gap:0}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"0 16px",height:52,border:"none",cursor:"pointer",background:"transparent",fontSize:13,fontWeight:tab===t.id?700:500,fontFamily:F,color:tab===t.id?C.brand:C.g5,borderBottom:tab===t.id?`2px solid ${C.brand}`:"2px solid transparent",transition:"all 0.12s",whiteSpace:"nowrap"}}>{t.l}</button>)}
        </nav>

        {/* Actions */}
        <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
          {lastSync&&<span className="hd" style={{fontSize:11,color:C.g4,fontFamily:F}}>↻ {lastSync.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}
          <button onClick={fetch_} disabled={loading} style={{padding:"6px 13px",borderRadius:8,background:loading?C.brandLt:C.brand,border:"none",color:loading?C.brand:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:4,transition:"all 0.2s"}}>
            <span className={loading?"spin":""} style={{fontSize:13}}>↻</span>
            <span className="hd">{loading?"Syncing…":"Sync"}</span>
          </button>
          <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noreferrer" style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surfaceAlt,color:C.g6,fontSize:12,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:3}}>↗<span className="hd"> Sheet</span></a>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="d-mob" style={{borderTop:`1px solid ${C.borderLt}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr"}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"7px 4px 6px",border:"none",cursor:"pointer",background:"transparent",fontFamily:F,display:"flex",flexDirection:"column",alignItems:"center",gap:2,borderBottom:tab===t.id?`2px solid ${C.brand}`:"2px solid transparent"}}>
          <span style={{fontSize:16,lineHeight:1}}>{t.icon}</span>
          <span style={{fontSize:10,fontWeight:600,color:tab===t.id?C.brand:C.g4}}>{t.l}</span>
        </button>)}
      </nav>
    </header>

    <main style={{maxWidth:1280,margin:"0 auto",padding:"14px 14px 56px",display:"flex",flexDirection:"column",gap:12}}>

      {/* ══ OVERVIEW ══ */}
      {tab==="overview"&&<>
        {/* Page title row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:C.g9,letterSpacing:"-0.4px",fontFamily:F}}>Team Overview</h1>
            <p style={{fontSize:13,color:C.g4,marginTop:2,fontFamily:F}}>{filtered.length} tasks · {totH.toFixed(0)}h{hasF&&<span style={{color:C.orange,fontWeight:600}}> · filtered</span>}</p>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{background:C.surface,borderRadius:14,padding:"11px 14px",border:`1px solid ${C.border}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <DatePills value={df} onChange={v=>{setDf(v);if(v!=="custom"){setCs(null);setCe(null);}}} cs={cs} ce={ce} setCs={setCs} setCe={setCe}/>
          <Search value={q} onChange={setQ}/>
          <Sel value={fM} onChange={setFM} opts={[{v:"All",l:"All Members"},...allMembers.map(v=>({v,l:`${v} — ${gm(v).role}`}))]} minW={130}/>
          <Sel value={fR} onChange={setFR} opts={[{v:"All",l:"All Roles"},...allRoles.map(v=>({v,l:v}))]} minW={110}/>
          <Sel value={fT} onChange={setFT} opts={[{v:"All",l:"All Types"},...allTypes.map(v=>({v,l:v}))]} minW={110}/>
          <Sel value={fS} onChange={setFS} opts={[{v:"All",l:"All Status"},{v:"Completed",l:"Completed"},{v:"In-progress",l:"In-progress"},{v:"On-Hold",l:"On-Hold"}]} minW={110}/>
          {hasF&&<button onClick={clearF} style={{padding:"6px 11px",borderRadius:8,border:`1px solid ${C.orange}30`,background:C.orangeLt,color:C.orange,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>✕ Clear</button>}
        </div>

        {/* KPIs */}
        <div className="g4c" style={{gap:10}}>
          <KPI icon="📋" label="Tasks"       value={filtered.length}       sub={`${compl} done`}       color={C.brand}  bg={C.brandLt}/>
          <KPI icon="⏱"  label="Hours"       value={`${totH.toFixed(0)}h`} sub={`avg ${(totH/Math.max(allMembers.length,1)).toFixed(0)}h/member`} color={C.orange} bg={C.orangeLt}/>
          <KPI icon="🔄" label="In Progress" value={inP}                   sub="active"               color={C.teal}   bg={C.tealLt}/>
          <KPI icon="🐛" label="Bugs"        value={bugs}                  sub={`${((bugs/Math.max(filtered.length,1))*100).toFixed(0)}% of tasks`} color={C.red} bg={C.redLt}/>
        </div>

        {/* Trend */}
        <Card>
          <CardHead title="Daily Hours Trend" right={<>
            <Sel value={tF.member} onChange={v=>setTF({...tF,member:v})} opts={[{v:"All",l:"All Members"},...allMembers.map(v=>({v,l:v}))]} minW={90}/>
            <MiniDatePills filt={tF} setFilt={setTF}/>
          </>}/>
          <div style={{padding:"12px 16px"}}><TrendBars data={trendData}/></div>
        </Card>

        {/* Hours + Types */}
        <div className="g2" style={{gap:12}}>
          <Card>
            <CardHead title="Hours by Member" right={<>
              <Sel value={hF.type} onChange={v=>setHF({...hF,type:v})} opts={[{v:"All",l:"All Types"},...allTypes.map(v=>({v,l:v}))]} minW={90}/>
              <MiniDatePills filt={hF} setFilt={setHF}/>
            </>}/>
            <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
              {hoursData.map(m=>{
                const mm=gm(m.n);
                return <div key={m.n}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <Av name={m.n} size={22}/>
                      <span style={{fontSize:13,fontWeight:600,color:C.g8,fontFamily:F}}>{m.n}</span>
                      <RolePill name={m.n}/>
                    </div>
                    <span style={{fontSize:12,color:C.g5,fontWeight:700,fontFamily:F}}>{m.h}h · {m.t}t</span>
                  </div>
                  <div style={{height:5,background:C.surfaceAlt,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min((m.h/maxH)*100,100)}%`,background:mm.color,borderRadius:99,transition:"width .5s ease"}}/>
                  </div>
                </div>;
              })}
            </div>
          </Card>

          <Card>
            <CardHead title="Task Types" right={<>
              <Sel value={yF.member} onChange={v=>setYF({...yF,member:v})} opts={[{v:"All",l:"All Members"},...allMembers.map(v=>({v,l:v}))]} minW={90}/>
              <MiniDatePills filt={yF} setFilt={setYF}/>
            </>}/>
            <div style={{padding:"12px 16px",display:"flex",gap:14,alignItems:"flex-start"}}>
              <div style={{flexShrink:0}}><Donut segs={typeDonut} size={104}/></div>
              <div style={{flex:1,minWidth:0,paddingTop:4,display:"flex",flexDirection:"column",gap:7}}>
                {typeData.map(([type,hrs])=><div key={type} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{width:8,height:8,borderRadius:2,background:TC[type]||C.g4,display:"inline-block",flexShrink:0}}/>
                    <span style={{fontSize:12,color:C.g7,fontFamily:F}}>{type}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:C.g7,fontFamily:F}}>{hrs}h</span>
                </div>)}
              </div>
            </div>
          </Card>
        </div>

        {/* Status + Leaderboard */}
        <div className="g2" style={{gap:12}}>
          <Card>
            <CardHead title="Status Distribution"/>
            <div style={{padding:"12px 16px"}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><Donut segs={sDonut} size={104}/></div>
              {sDonut.map(d=><div key={d.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:10,marginBottom:7,background:`${d.c}0C`,border:`1px solid ${d.c}1E`}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:d.c,display:"inline-block"}}/>
                  <span style={{fontSize:13,fontWeight:600,color:C.g8,fontFamily:F}}>{d.l}</span>
                </div>
                <span style={{fontSize:22,fontWeight:800,color:d.c,fontFamily:F}}>{d.v}</span>
              </div>)}
            </div>
          </Card>

          <Card>
            <CardHead title="Leaderboard" right={<div style={{display:"flex",background:C.surfaceAlt,borderRadius:7,padding:2,gap:1,border:`1px solid ${C.border}`}}>
              {["hours","tasks"].map(id=><button key={id} onClick={()=>setMs(id)} style={{padding:"3px 9px",borderRadius:5,border:"none",cursor:"pointer",background:ms===id?C.brand:"transparent",color:ms===id?"#fff":C.g5,fontSize:11,fontWeight:600,fontFamily:F,textTransform:"capitalize"}}>{id}</button>)}
            </div>}/>
            <div style={{padding:"4px 12px 8px"}}>
              {mStats.slice(0,8).map((m,i)=>{
                const mm=gm(m.n);
                return <div key={m.n} onClick={()=>{setFM(m.n);setTab("tasks");}} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 4px",borderBottom:i<7?`1px solid ${C.borderLt}`:"none",cursor:"pointer"}}>
                  <span style={{fontSize:10,color:C.g4,width:16,fontWeight:700,textAlign:"center",fontFamily:F,flexShrink:0}}>#{i+1}</span>
                  <Av name={m.n} size={28}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.g8,fontFamily:F}}>{m.n}</div>
                    <RolePill name={m.n}/>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:15,fontWeight:800,color:mm.color,fontFamily:F}}>{ms==="hours"?`${m.h}h`:m.t}</div>
                    <div style={{fontSize:10,color:C.g4,fontFamily:F}}>{ms==="hours"?`${m.t}t`:`${m.h}h`}</div>
                  </div>
                </div>;
              })}
            </div>
          </Card>
        </div>
      </>}

      {/* ══ DAILY ══ */}
      {tab==="daily"&&<>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:C.g9,letterSpacing:"-0.4px",fontFamily:F}}>
              Daily View {isToday&&<span style={{fontSize:13,fontWeight:600,padding:"3px 10px",borderRadius:99,background:C.brandLt,color:C.brand,marginLeft:6,verticalAlign:"middle"}}>Today</span>}
            </h1>
            <p style={{fontSize:13,color:C.g4,marginTop:2,fontFamily:F}}>{resolvedD||"—"}</p>
          </div>
          <Sel value={day} onChange={setDay} opts={[{v:"latest",l:`Latest · ${latestD}`},...allDates.map(d=>({v:d,l:d}))]} minW={160}/>
        </div>

        <div className="g4c" style={{gap:10}}>
          <KPI icon="📋" label="Tasks"   value={dayTasks.length} color={C.brand} bg={C.brandLt}/>
          <KPI icon="⏱"  label="Hours"   value={`${dayTasks.reduce((s,r)=>s+(r.hours||0),0)}h`} color={C.orange} bg={C.orangeLt}/>
          <KPI icon="👥" label="Members" value={[...new Set(dayTasks.map(r=>r.assignee))].length} color={C.teal} bg={C.tealLt}/>
          <KPI icon="🐛" label="Bugs"    value={dayTasks.filter(r=>r.type==="Bug Fixing").length} color={C.red} bg={C.redLt}/>
        </div>

        {dayByM.length===0&&<Card sx={{padding:"48px 24px",textAlign:"center"}}><span style={{fontSize:13,color:C.g4,fontFamily:F}}>No tasks logged for this date.</span></Card>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12}}>
          {dayByM.map(([name,tasks])=>{
            const hrs=tasks.reduce((s,r)=>s+(r.hours||0),0);
            const mm=gm(name);
            return <Card key={name} sx={{borderTop:`3px solid ${mm.color}`}}>
              <div style={{padding:"13px 15px",borderBottom:`1px solid ${C.borderLt}`,display:"flex",alignItems:"center",gap:11}}>
                <Av name={name} size={38}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:C.g9,fontFamily:F}}>{name}</div>
                  <RolePill name={name} sx={{marginTop:3}}/>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:22,fontWeight:800,color:mm.color,fontFamily:F,letterSpacing:"-0.5px"}}>{hrs}h</div>
                  <div style={{fontSize:10,color:C.g4,fontFamily:F}}>{tasks.length} tasks</div>
                </div>
              </div>
              <div style={{padding:"9px 12px",display:"flex",flexDirection:"column",gap:7}}>
                {tasks.map(t=><div key={t.id} style={{padding:"9px 11px",background:C.surfaceAlt,borderRadius:10,border:`1px solid ${C.borderLt}`}}>
                  <div style={{fontSize:12,color:C.g7,lineHeight:1.5,marginBottom:6,fontWeight:500,fontFamily:F}}>{t.task}</div>
                  <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
                    <TBadge label={t.type}/>
                    <SBadge label={t.status}/>
                    <span style={{fontSize:11,color:C.g4,marginLeft:"auto",fontWeight:700,fontFamily:F}}>{t.hours}h</span>
                  </div>
                </div>)}
              </div>
            </Card>;
          })}
        </div>
      </>}

      {/* ══ TEAM ══ */}
      {tab==="team"&&<>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:C.g9,letterSpacing:"-0.4px",fontFamily:F}}>Team Members</h1>
            <p style={{fontSize:13,color:C.g4,marginTop:2,fontFamily:F}}>{teamMems.length} members</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Sel value={tf} onChange={setTf} opts={[{v:"All",l:"All Roles"},...allRoles.map(r=>({v:r,l:r}))]}/>
            <Sel value={ms} onChange={setMs} opts={[{v:"hours",l:"Sort: Hours"},{v:"tasks",l:"Sort: Tasks"}]}/>
          </div>
        </div>

        {teamMems.map(name=>{
          const tasks=data.filter(r=>r.assignee===name);
          const hrs=tasks.reduce((s,r)=>s+(r.hours||0),0);
          const bugsN=tasks.filter(t=>t.type==="Bug Fixing").length;
          const byT={};tasks.forEach(t=>{byT[t.type]=(byT[t.type]||0)+1;});
          const byS={};tasks.forEach(t=>{byS[t.status]=(byS[t.status]||0)+1;});
          const mm=gm(name);
          return <Card key={name} sx={{borderLeft:`4px solid ${mm.color}`,marginBottom:0}}>
            <div style={{padding:"15px 18px"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
                <Av name={name} size={46}/>
                <div style={{flex:1,minWidth:120}}>
                  <div style={{fontWeight:800,fontSize:16,color:C.g9,fontFamily:F}}>{name}</div>
                  <RolePill name={name} sx={{marginTop:4}}/>
                </div>
                <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                  {[{l:"Hours",v:hrs,c:mm.color},{l:"Tasks",v:tasks.length,c:C.g8},{l:"Bugs",v:bugsN,c:C.red}].map(({l,v,c})=><div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:F,letterSpacing:"-0.5px"}}>{v}</div>
                    <div style={{fontSize:9,color:C.g4,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:F}}>{l}</div>
                  </div>)}
                  <button onClick={()=>{setFM(name);setTab("tasks");}} style={{padding:"7px 13px",borderRadius:9,border:`1.5px solid ${C.brand}`,background:C.brandLt,color:C.brandDk,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>Tasks →</button>
                </div>
              </div>
              {/* Stats */}
              <div className="g3" style={{gap:10}}>
                <div style={{background:C.surfaceAlt,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:C.g4,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8,fontFamily:F}}>By Type</div>
                  {Object.entries(byT).sort((a,b)=>b[1]-a[1]).map(([t,n])=><div key={t} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:7,height:7,borderRadius:2,background:TC[t]||C.g4,display:"inline-block"}}/><span style={{fontSize:11,color:C.g6,fontFamily:F}}>{t}</span></div>
                    <span style={{fontSize:11,fontWeight:700,color:TC[t]||C.g6,fontFamily:F}}>{n}</span>
                  </div>)}
                </div>
                <div style={{background:C.surfaceAlt,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:C.g4,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8,fontFamily:F}}>By Status</div>
                  {Object.entries(byS).map(([s,n])=><div key={s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <SBadge label={s}/><span style={{fontSize:13,fontWeight:800,color:SC[s]?.c||C.g6,fontFamily:F}}>{n}</span>
                  </div>)}
                </div>
                <div style={{background:C.surfaceAlt,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:C.g4,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8,fontFamily:F}}>Recent</div>
                  {tasks.slice(0,3).map(t=><div key={t.id} style={{fontSize:11,color:C.g6,marginBottom:6,lineHeight:1.45,borderLeft:`2px solid ${mm.color}`,paddingLeft:7,fontFamily:F}}>{t.task.length>55?t.task.slice(0,55)+"…":t.task}</div>)}
                </div>
              </div>
            </div>
          </Card>;
        })}
      </>}

      {/* ══ TASKS ══ */}
      {tab==="tasks"&&<>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:C.g9,letterSpacing:"-0.4px",fontFamily:F}}>All Tasks</h1>
            <p style={{fontSize:13,color:C.g4,marginTop:2,fontFamily:F}}>Showing {filtered.length} of {data.length}</p>
          </div>
        </div>

        {/* Tasks filter bar */}
        <div style={{background:C.surface,borderRadius:14,padding:"11px 14px",border:`1px solid ${C.border}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <DatePills value={df} onChange={v=>{setDf(v);if(v!=="custom"){setCs(null);setCe(null);}}} cs={cs} ce={ce} setCs={setCs} setCe={setCe}/>
          <Search value={q} onChange={setQ}/>
          <Sel value={fM} onChange={setFM} opts={[{v:"All",l:"All Members"},...allMembers.map(v=>({v,l:`${v} — ${gm(v).role}`}))]} minW={130}/>
          <Sel value={fR} onChange={setFR} opts={[{v:"All",l:"All Roles"},...allRoles.map(v=>({v,l:v}))]} minW={110}/>
          <Sel value={fT} onChange={setFT} opts={[{v:"All",l:"All Types"},...allTypes.map(v=>({v,l:v}))]} minW={110}/>
          <Sel value={fS} onChange={setFS} opts={[{v:"All",l:"All Status"},{v:"Completed",l:"Completed"},{v:"In-progress",l:"In-progress"},{v:"On-Hold",l:"On-Hold"}]} minW={110}/>
          {hasF&&<button onClick={clearF} style={{padding:"6px 11px",borderRadius:8,border:`1px solid ${C.orange}30`,background:C.orangeLt,color:C.orange,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>✕ Clear</button>}
        </div>

        {/* Desktop table */}
        <Card sx={{overflow:"hidden"}} className="d-desk hd">
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:C.surfaceAlt}}>
              {["Date","Task","Assigned To","Role","Type","Hours","Status"].map(col=><th key={col} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:C.g5,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,fontFamily:F,whiteSpace:"nowrap"}}>{col}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((t,i)=>{
                const mm=gm(t.assignee);
                return <tr key={t.id} style={{borderBottom:`1px solid ${C.borderLt}`,background:i%2===0?C.surface:C.surfaceAlt}}>
                  <td style={{padding:"10px 14px",fontSize:12,color:C.g4,whiteSpace:"nowrap",fontFamily:F}}>{t.date||"—"}</td>
                  <td style={{padding:"10px 14px",maxWidth:360}}><div style={{fontSize:13,color:C.g7,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:F}}>{t.task}</div></td>
                  <td style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:7}}><Av name={t.assignee} size={22}/><span style={{fontSize:13,fontWeight:600,color:C.g8,fontFamily:F}}>{t.assignee}</span></div></td>
                  <td style={{padding:"10px 14px"}}><RolePill name={t.assignee}/></td>
                  <td style={{padding:"10px 14px"}}><TBadge label={t.type}/></td>
                  <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,color:C.g8,textAlign:"right",fontFamily:F}}>{t.hours}h</td>
                  <td style={{padding:"10px 14px"}}><SBadge label={t.status}/></td>
                </tr>;
              })}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{padding:"48px 24px",textAlign:"center",color:C.g4,fontSize:13,fontFamily:F}}>No tasks match filters.</div>}
        </Card>

        {/* Mobile cards */}
        <div className="hs" style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(t=>{
            const mm=gm(t.assignee);
            return <div key={t.id} style={{background:C.surface,borderRadius:12,padding:"13px 14px",border:`1px solid ${C.borderLt}`,borderLeft:`4px solid ${mm.color}`}}>
              <div style={{fontSize:13,fontWeight:600,color:C.g8,marginBottom:8,lineHeight:1.45,fontFamily:F}}>{t.task}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                <Av name={t.assignee} size={20}/>
                <span style={{fontSize:12,color:C.g7,fontWeight:600,fontFamily:F}}>{t.assignee}</span>
                <RolePill name={t.assignee}/>
                <div style={{marginLeft:"auto",display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
                  <TBadge label={t.type}/>
                  <SBadge label={t.status}/>
                  <span style={{fontSize:12,fontWeight:700,color:C.g8,fontFamily:F}}>{t.hours}h</span>
                </div>
              </div>
              <div style={{fontSize:11,color:C.g4,marginTop:7,fontFamily:F}}>{t.date}</div>
            </div>;
          })}
          {filtered.length===0&&<div style={{padding:"32px 16px",textAlign:"center",color:C.g4,fontSize:13,background:C.surface,borderRadius:12,fontFamily:F}}>No tasks match filters.</div>}
        </div>
      </>}

      {/* Footer */}
      <div style={{textAlign:"center",paddingTop:14,borderTop:`1px solid ${C.border}`}}>
        <span style={{fontSize:11,color:C.g4,fontFamily:F}}>Taabi TMS Tracker · <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noreferrer" style={{color:C.brand,textDecoration:"none",fontWeight:600}}>Open Sheet ↗</a></span>
      </div>
    </main>
  </div>;
}
