const PDFDocument = require('pdfkit');

function money(v){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)||0)}
function createPdf(data){
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'LETTER',margin:48,info:{Title:`WPC Payment Intelligence - ${data.business_name||data.merchant_name||'Merchant'}`}});
    const chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    doc.fontSize(21).text('WPC Payment Intelligence™',{align:'center'});
    doc.fontSize(10).fillColor('#667085').text('Powered by WPC Merchant Advantage LLC',{align:'center'}).moveDown(1.5);
    doc.fillColor('#111827').fontSize(16).text('Executive Merchant Analysis');doc.moveDown(.5);
    doc.fontSize(10).text(`Analysis ID: ${data.analysis_id||''}`);doc.text(`Business: ${data.business_name||data.merchant_name||''}`);doc.text(`Contact: ${data.contact_name||''}`);doc.text(`Email: ${data.business_email||''}`);doc.text(`Processor: ${data.current_processor||data.processor||''}`);doc.text(`Statement Period: ${data.statement_period||''}`);doc.moveDown();
    doc.fontSize(14).text('Verified Statement Metrics');doc.fontSize(10);
    [['Statement Volume',money(data.volume)],['Processing Cost',money(data.processing_cost)],['Effective Rate',`${Number(data.effective_rate||0).toFixed(2)}%`],['Transactions',String(data.transactions||0)],['Pricing Model',data.pricing_model||''],['Statement Grade',data.statement_grade||''],['Priority',data.priority||'']].forEach(([a,b])=>doc.text(`${a}: ${b}`));
    doc.moveDown();doc.fontSize(14).text('Opportunity Summary');doc.fontSize(10);
    doc.text(`Reviewable Fees Identified: ${data.reviewable_fee_count||0}`);doc.text(`Annual Fee Impact: ${money(data.annual_fee_impact)}`);doc.text(`Estimated Monthly Opportunity: Up to ${money(data.estimated_monthly_opportunity)}`);doc.text(`Estimated Annual Opportunity: Up to ${money(data.estimated_annual_opportunity)}`);doc.text(`Recommended Action: ${data.recommendation||''}`);doc.moveDown();
    if(data.executive_summary){doc.fontSize(14).text('Executive Summary');doc.fontSize(10).text(data.executive_summary,{lineGap:3});doc.moveDown();}
    if(Array.isArray(data.fees)&&data.fees.length){doc.fontSize(14).text('Reviewable Fees');doc.fontSize(10);data.fees.forEach(f=>doc.text(`• ${f.name}: ${money(f.monthly)}/month (${money(f.annual)}/year) — ${f.risk||'Review'}`));doc.moveDown();}
    doc.fontSize(8).fillColor('#667085').text('Estimates are based on the statement information supplied and should be verified before making processing decisions. Your Advantage in Payment Solutions.',{align:'center'});
    doc.end();
  });
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST') return {statusCode:405,body:JSON.stringify({error:'Method not allowed'})};
  let data;try{data=JSON.parse(event.body||'{}')}catch(_){return {statusCode:400,body:JSON.stringify({error:'Invalid JSON'})}}
  const apiKey=process.env.RESEND_API_KEY;
  const notifyTo=process.env.WPC_NOTIFICATION_EMAIL||'perocier01@merchantadvantage.com';
  const from=process.env.WPC_FROM_EMAIL||'WPC Payment Intelligence <onboarding@resend.dev>';
  if(!apiKey) return {statusCode:503,body:JSON.stringify({error:'RESEND_API_KEY is not configured',saved:true})};
  try{
    const pdf=await createPdf(data);
    const subject=`New V9 Warm Lead — ${data.business_name||data.merchant_name||'Merchant'} — ${money(data.estimated_monthly_opportunity)}/mo opportunity`;
    const lines=[`Analysis ID: ${data.analysis_id||''}`,`Business: ${data.business_name||data.merchant_name||''}`,`Contact: ${data.contact_name||''}`,`Email: ${data.business_email||''}`,`Phone: ${data.phone||''}`,`Processor: ${data.current_processor||data.processor||''}`,`Statement volume: ${money(data.volume)}`,`Effective rate: ${Number(data.effective_rate||0).toFixed(2)}%`,`Pricing model: ${data.pricing_model||''}`,`Grade: ${data.statement_grade||''}`,`Reviewable fees: ${data.reviewable_fee_count||0}`,`Estimated annual opportunity: ${money(data.estimated_annual_opportunity)}`,`Recommendation: ${data.recommendation||''}`];
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[notifyTo],subject,text:lines.join('\n'),attachments:[{filename:`WPC-Analysis-${String(data.business_name||data.merchant_name||'Merchant').replace(/[^a-z0-9]+/gi,'-')}-${data.analysis_id||'Report'}.pdf`,content:pdf.toString('base64')} ]})});
    const result=await response.json();if(!response.ok) throw new Error(result.message||'Email delivery failed');
    return {statusCode:200,body:JSON.stringify({ok:true,id:result.id})};
  }catch(error){console.error(error);return {statusCode:500,body:JSON.stringify({error:error.message})};}
};
