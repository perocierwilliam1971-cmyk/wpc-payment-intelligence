const PDFDocument = require('pdfkit');

function money(value){
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)||0);
}

function safe(value){ return String(value ?? '').trim(); }

function createPdf(data){
  return new Promise((resolve,reject)=>{
    const merchant=safe(data.business_name||data.merchant_name||'Merchant');
    const doc=new PDFDocument({
      size:'LETTER',
      margins:{top:42,bottom:42,left:46,right:46},
      info:{
        Title:`WPC Executive Proposal - ${merchant}`,
        Author:'WPC Merchant Advantage LLC',
        Subject:'Merchant Processing Statement Analysis'
      }
    });
    const chunks=[];
    doc.on('data',chunk=>chunks.push(chunk));
    doc.on('end',()=>resolve(Buffer.concat(chunks)));
    doc.on('error',reject);

    const navy='#0b1f39', blue='#2f6edb', gold='#d9b24c', green='#2f7d4d', red='#bd433b', gray='#667085', light='#eef2f7';
    const pageWidth=doc.page.width;
    const contentWidth=pageWidth-doc.page.margins.left-doc.page.margins.right;

    function heading(text){
      doc.moveDown(.65).fillColor(navy).font('Helvetica-Bold').fontSize(14).text(text).moveDown(.35);
    }
    function row(label,value,options={}){
      const y=doc.y;
      doc.fillColor(gray).font('Helvetica').fontSize(9).text(label,doc.page.margins.left,y,{width:210});
      doc.fillColor(options.color||navy).font('Helvetica-Bold').fontSize(10).text(safe(value),doc.page.margins.left+215,y,{width:contentWidth-215,align:'right'});
      doc.moveDown(.65);
    }
    function ensureSpace(height=90){
      if(doc.y+height>doc.page.height-doc.page.margins.bottom){ doc.addPage(); }
    }

    doc.rect(0,0,pageWidth,88).fill(navy);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('WPC Payment Intelligence™',46,28,{width:contentWidth});
    doc.fillColor('#d9e2ef').font('Helvetica').fontSize(9).text('Powered by WPC Merchant Advantage LLC · Your Advantage in Payment Solutions',46,58,{width:contentWidth});

    doc.y=112;
    doc.fillColor(blue).font('Helvetica-Bold').fontSize(9).text('EXECUTIVE MERCHANT ANALYSIS');
    doc.fillColor(navy).font('Helvetica-Bold').fontSize(24).text(merchant,{width:contentWidth});
    doc.fillColor(gray).font('Helvetica').fontSize(9).text(`Analysis ID: ${safe(data.analysis_id)}   •   Statement Period: ${safe(data.statement_period)}`);
    doc.moveDown(1);

    const boxY=doc.y;
    doc.roundedRect(46,boxY,contentWidth,86,10).fill(light);
    const metricW=contentWidth/4;
    const metrics=[
      ['MONTHLY VOLUME',money(data.volume),navy],
      ['EFFECTIVE RATE',`${Number(data.effective_rate||0).toFixed(2)}%`,red],
      ['STATEMENT GRADE',safe(data.statement_grade),blue],
      ['ANNUAL OPPORTUNITY',money(data.estimated_annual_opportunity),green],
    ];
    metrics.forEach((m,i)=>{
      const x=46+i*metricW;
      doc.fillColor(gray).font('Helvetica-Bold').fontSize(7.5).text(m[0],x+10,boxY+15,{width:metricW-20,align:'center'});
      doc.fillColor(m[2]).font('Helvetica-Bold').fontSize(i===3?15:20).text(m[1],x+8,boxY+38,{width:metricW-16,align:'center'});
    });
    doc.y=boxY+102;

    heading('Merchant & Statement Profile');
    row('Business',merchant);
    row('Contact',safe(data.contact_name));
    row('Business Email',safe(data.business_email));
    row('Phone',safe(data.phone));
    row('Business Type',safe(data.business_type||data.industry));
    row('Current Processor',safe(data.current_processor||data.processor));
    row('Pricing Model',`${safe(data.pricing_model)} (${Number(data.pricing_confidence||0)}% confidence)`);
    row('Transactions',Number(data.transactions||0).toLocaleString('en-US'));
    row('Total Processing Cost',money(data.processing_cost));

    ensureSpace(180);
    heading('Opportunity Summary');
    row('Merchant Health Score',`${Number(data.merchant_health||0)}/100`);
    row('Opportunity Score',`${Number(data.opportunity_score||0)}/100`);
    row('Priority',safe(data.priority),{color:data.priority==='High'?red:navy});
    row('Reviewable Fees Identified',safe(data.reviewable_fee_count));
    row('Annual Fee Impact',money(data.annual_fee_impact));
    row('Estimated Monthly Opportunity',`Up to ${money(data.estimated_monthly_opportunity)}`,{color:green});
    row('Estimated Annual Opportunity',`Up to ${money(data.estimated_annual_opportunity)}`,{color:green});

    ensureSpace(140);
    heading('Recommended Action');
    doc.fillColor(navy).font('Helvetica-Bold').fontSize(12).text(safe(data.recommendation)||'Review the statement findings with a payment professional.',{lineGap:3});

    if(safe(data.executive_summary)){
      ensureSpace(180);
      heading('Executive Summary');
      doc.fillColor('#252b37').font('Helvetica').fontSize(10).text(safe(data.executive_summary),{lineGap:4,align:'left'});
    }

    if(Array.isArray(data.fees)&&data.fees.length){
      ensureSpace(140);
      heading('Reviewable Fee Intelligence');
      data.fees.forEach((fee,index)=>{
        ensureSpace(44);
        const name=safe(fee.name||fee.fee||`Fee ${index+1}`);
        const monthly=money(fee.monthly);
        const annual=money(fee.annual);
        doc.fillColor(navy).font('Helvetica-Bold').fontSize(10).text(name,{continued:true});
        doc.fillColor(gray).font('Helvetica').text(`  ·  ${monthly}/month  ·  ${annual}/year  ·  ${safe(fee.risk||'Review')}`);
      });
    }

    ensureSpace(105);
    doc.moveDown(1.2);
    doc.roundedRect(46,doc.y,contentWidth,70,9).fill('#f8fafc');
    const noteY=doc.y+13;
    doc.fillColor(navy).font('Helvetica-Bold').fontSize(9).text('Important disclosure',58,noteY,{width:contentWidth-24});
    doc.fillColor(gray).font('Helvetica').fontSize(8).text('All savings and optimization figures are estimates based on the statement information supplied. Card mix, interchange detail, contractual terms, equipment obligations, and applicable rules should be reviewed before any processing decision is made.',58,noteY+18,{width:contentWidth-24,lineGap:2});

    doc.fillColor(gray).font('Helvetica').fontSize(8).text('WPC Merchant Advantage LLC · Your Advantage in Payment Solutions',46,doc.page.height-30,{width:contentWidth,align:'center'});
    doc.end();
  });
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST'){
    return {statusCode:405,headers:{Allow:'POST'},body:JSON.stringify({error:'Method not allowed'})};
  }
  let data;
  try{ data=JSON.parse(event.body||'{}'); }
  catch(_){ return {statusCode:400,body:JSON.stringify({error:'Invalid JSON'})}; }
  if(!data || !data.analysis_id || !data.volume){
    return {statusCode:400,body:JSON.stringify({error:'A completed current analysis is required'})};
  }
  try{
    const pdf=await createPdf(data);
    const merchant=safe(data.business_name||data.merchant_name||'Merchant').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'');
    const filename=`WPC-Executive-Proposal-${merchant}-${safe(data.analysis_id)||'Analysis'}.pdf`;
    return {
      statusCode:200,
      isBase64Encoded:true,
      headers:{
        'Content-Type':'application/pdf',
        'Content-Disposition':`attachment; filename="${filename}"`,
        'Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff'
      },
      body:pdf.toString('base64')
    };
  }catch(error){
    console.error('PDF generation failed',error);
    return {statusCode:500,body:JSON.stringify({error:'PDF generation failed'})};
  }
};
