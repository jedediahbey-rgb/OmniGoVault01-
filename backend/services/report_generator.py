"""
Trust Health Report Generator
Generates comprehensive PDF reports for trust health analysis.
"""

from datetime import datetime, timezone
from typing import Dict, List, Any
from io import BytesIO
import hashlib

# Use reportlab for PDF generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.graphics.shapes import Drawing, Rect, String, Circle
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart


class TrustHealthReportGenerator:
    """
    Generates professional PDF reports for Trust Health analysis.
    """
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=20,
            textColor=colors.Color(0.776, 0.659, 0.486)  # Gold color
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.Color(0.776, 0.659, 0.486)
        ))
        
        self.styles.add(ParagraphStyle(
            name='SubSection',
            parent=self.styles['Heading3'],
            fontSize=12,
            spaceBefore=15,
            spaceAfter=8,
            textColor=colors.white
        ))
        
        self.styles.add(ParagraphStyle(
            name='ReportBody',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.Color(0.8, 0.8, 0.8),
            spaceAfter=6
        ))
        
        self.styles.add(ParagraphStyle(
            name='ReportSmall',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.Color(0.6, 0.6, 0.6)
        ))
    
    def generate_report(
        self,
        health_data: Dict,
        audit_data: Dict,
        timeline_data: Dict,
        trust_name: str = "Equity Trust"
    ) -> BytesIO:
        """
        Generate a comprehensive Trust Health PDF report.
        
        Args:
            health_data: Health scan results
            audit_data: Audit readiness results
            timeline_data: Timeline and events data
            trust_name: Name of the trust
        
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        
        story = []
        
        # Title Page
        story.extend(self._create_title_page(trust_name, health_data))
        
        # Executive Summary
        story.extend(self._create_executive_summary(health_data, audit_data))
        
        # Health Score Breakdown
        story.extend(self._create_health_breakdown(health_data))
        
        # Audit Readiness Section
        story.extend(self._create_audit_section(audit_data))
        
        # Findings & Recommendations
        story.extend(self._create_findings_section(health_data))
        
        # Timeline & Events
        story.extend(self._create_timeline_section(timeline_data))
        
        # Footer with hash
        story.extend(self._create_footer(health_data))
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def _create_title_page(self, trust_name: str, health_data: Dict) -> List:
        """Create the title page."""
        elements = []
        
        # Title
        elements.append(Paragraph(
            f"Trust Health Report",
            self.styles['ReportTitle']
        ))
        
        elements.append(Paragraph(
            f"<b>{trust_name}</b>",
            self.styles['Heading2']
        ))
        
        elements.append(Spacer(1, 0.5*inch))
        
        # Report metadata
        generated_at = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")
        scan_id = health_data.get('scan_id', 'N/A')
        
        elements.append(Paragraph(
            f"Generated: {generated_at}",
            self.styles['ReportBody']
        ))
        elements.append(Paragraph(
            f"Scan ID: {scan_id}",
            self.styles['ReportSmall']
        ))
        
        elements.append(Spacer(1, 0.5*inch))
        
        # Big score display
        score = health_data.get('overall_score', 0)
        score_color = colors.green if score >= 80 else colors.orange if score >= 60 else colors.red
        
        score_table = Table(
            [[Paragraph(f"<font size=48><b>{int(score)}</b></font>", self.styles['Normal'])]],
            colWidths=[2*inch],
            rowHeights=[1.5*inch]
        )
        score_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TEXTCOLOR', (0, 0), (-1, -1), score_color),
            ('BOX', (0, 0), (-1, -1), 2, score_color),
            ('BACKGROUND', (0, 0), (-1, -1), colors.Color(0.05, 0.07, 0.13)),
        ]))
        
        elements.append(score_table)
        elements.append(Paragraph("Overall Health Score", self.styles['ReportBody']))
        
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_executive_summary(self, health_data: Dict, audit_data: Dict) -> List:
        """Create executive summary section."""
        elements = []
        
        elements.append(Paragraph("Executive Summary", self.styles['SectionTitle']))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.3, 0.3, 0.3)))
        
        score = health_data.get('overall_score', 0)
        audit_score = audit_data.get('audit_score', 0)
        findings_count = health_data.get('findings_count', {})
        stats = health_data.get('stats', {})
        
        # Summary text
        status = "excellent" if score >= 80 else "good" if score >= 60 else "needs attention"
        summary_text = f"""
        This report provides a comprehensive analysis of your trust's governance health. 
        Your current health score is <b>{int(score)}/100</b>, which is considered <b>{status}</b>.
        
        <br/><br/>
        
        <b>Key Metrics:</b><br/>
        • Total Records Scanned: {stats.get('total_records', 0)}<br/>
        • Total Portfolios: {stats.get('total_portfolios', 0)}<br/>
        • Critical Issues: {findings_count.get('critical', 0)}<br/>
        • Warnings: {findings_count.get('warning', 0)}<br/>
        • Audit Readiness: {int(audit_score)}%
        """
        
        elements.append(Paragraph(summary_text, self.styles['ReportBody']))
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_health_breakdown(self, health_data: Dict) -> List:
        """Create health score breakdown section."""
        elements = []
        
        elements.append(Paragraph("Health Score Breakdown", self.styles['SectionTitle']))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.3, 0.3, 0.3)))
        
        category_scores = health_data.get('category_scores', {})
        
        category_names = {
            'governance_hygiene': 'Governance Hygiene',
            'financial_integrity': 'Financial Integrity',
            'compliance_recordkeeping': 'Compliance & Records',
            'risk_exposure': 'Risk & Exposure',
            'data_integrity': 'Data Integrity'
        }
        
        weights = {
            'governance_hygiene': 25,
            'financial_integrity': 25,
            'compliance_recordkeeping': 15,
            'risk_exposure': 15,
            'data_integrity': 20
        }
        
        # Create category table
        table_data = [['Category', 'Score', 'Weight', 'Status']]
        
        for cat_id, name in category_names.items():
            score = category_scores.get(cat_id, 0)
            weight = weights.get(cat_id, 0)
            status = '✓ Good' if score >= 80 else '⚠ Fair' if score >= 60 else '✗ Needs Work'
            table_data.append([name, f"{int(score)}/100", f"{weight}%", status])
        
        table = Table(table_data, colWidths=[2.5*inch, 1*inch, 1*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.776, 0.659, 0.486)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.Color(0.05, 0.07, 0.13)),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (2, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.Color(0.1, 0.12, 0.18)),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.Color(0.8, 0.8, 0.8)),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.3, 0.3, 0.3)),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Blocking conditions
        blocking = health_data.get('blocking_conditions', [])
        if blocking:
            elements.append(Paragraph("⚠ Score Caps Applied:", self.styles['SubSection']))
            for condition in blocking:
                elements.append(Paragraph(f"• {condition}", self.styles['ReportBody']))
        
        return elements
    
    def _create_audit_section(self, audit_data: Dict) -> List:
        """Create audit readiness section."""
        elements = []
        
        elements.append(Paragraph("Audit Readiness", self.styles['SectionTitle']))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.3, 0.3, 0.3)))
        
        audit_score = audit_data.get('audit_score', 0)
        ready = audit_data.get('ready_for_audit', False)
        passed = audit_data.get('passed_items', 0)
        total = audit_data.get('total_items', 0)
        
        status_text = "Ready for Audit ✓" if ready else "Not Ready for Audit ⚠"
        status_color = colors.green if ready else colors.orange
        
        summary = f"""
        <b>Audit Readiness Score: {int(audit_score)}%</b><br/>
        Status: <font color="{'green' if ready else 'orange'}">{status_text}</font><br/>
        Items Passed: {passed} / {total}
        """
        elements.append(Paragraph(summary, self.styles['ReportBody']))
        elements.append(Spacer(1, 0.2*inch))
        
        # Checklist by category
        checklist = audit_data.get('checklist', {})
        for category, items in checklist.items():
            passed_cat = len([i for i in items if i.get('status') == 'pass'])
            elements.append(Paragraph(
                f"<b>{category.title()}</b> ({passed_cat}/{len(items)})",
                self.styles['SubSection']
            ))
            
            for item in items:
                status_icon = '✓' if item.get('status') == 'pass' else '✗'
                required = ' (Required)' if item.get('required') else ''
                elements.append(Paragraph(
                    f"{status_icon} {item.get('name', 'Unknown')}{required}",
                    self.styles['ReportSmall']
                ))
        
        elements.append(Spacer(1, 0.3*inch))
        return elements
    
    def _create_findings_section(self, health_data: Dict) -> List:
        """Create findings and recommendations section."""
        elements = []
        
        elements.append(Paragraph("Findings & Recommendations", self.styles['SectionTitle']))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.3, 0.3, 0.3)))
        
        findings = health_data.get('findings', [])
        next_actions = health_data.get('next_actions', [])
        
        if not findings and not next_actions:
            elements.append(Paragraph(
                "✓ No issues found. Your trust governance is in excellent health.",
                self.styles['ReportBody']
            ))
        else:
            # Critical findings
            critical = [f for f in findings if f.get('severity') == 'critical']
            if critical:
                elements.append(Paragraph("Critical Issues:", self.styles['SubSection']))
                for finding in critical[:5]:
                    elements.append(Paragraph(
                        f"• {finding.get('title', 'Unknown')}: {finding.get('description', '')}",
                        self.styles['ReportBody']
                    ))
            
            # Warnings
            warnings = [f for f in findings if f.get('severity') == 'warning']
            if warnings:
                elements.append(Paragraph("Warnings:", self.styles['SubSection']))
                for finding in warnings[:5]:
                    elements.append(Paragraph(
                        f"• {finding.get('title', 'Unknown')}: {finding.get('description', '')}",
                        self.styles['ReportBody']
                    ))
            
            # Top recommendations
            if next_actions:
                elements.append(Paragraph("Top Recommendations:", self.styles['SubSection']))
                for i, action in enumerate(next_actions[:5], 1):
                    elements.append(Paragraph(
                        f"{i}. {action.get('title', 'Unknown')} (+{action.get('impact_points', 0)} points)",
                        self.styles['ReportBody']
                    ))
        
        elements.append(Spacer(1, 0.3*inch))
        return elements
    
    def _create_timeline_section(self, timeline_data: Dict) -> List:
        """Create timeline section."""
        elements = []
        
        elements.append(Paragraph("Recent Activity", self.styles['SectionTitle']))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.3, 0.3, 0.3)))
        
        events = timeline_data.get('events', [])
        
        if not events:
            elements.append(Paragraph(
                "No recent events recorded.",
                self.styles['ReportBody']
            ))
        else:
            for event in events[:10]:
                date_str = event.get('date', '')[:10] if event.get('date') else 'Unknown'
                elements.append(Paragraph(
                    f"• [{date_str}] {event.get('title', 'Unknown event')}",
                    self.styles['ReportBody']
                ))
        
        elements.append(Spacer(1, 0.3*inch))
        return elements
    
    def _create_footer(self, health_data: Dict) -> List:
        """Create report footer with integrity hash."""
        elements = []
        
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.3, 0.3, 0.3)))
        
        # Generate report hash for integrity
        report_content = str(health_data)
        report_hash = hashlib.sha256(report_content.encode()).hexdigest()[:16]
        
        footer_text = f"""
        <br/>
        <font size=8 color="gray">
        This report was generated automatically by the Trust Health System.<br/>
        Report Integrity Hash: {report_hash}<br/>
        Generated: {datetime.now(timezone.utc).isoformat()}<br/>
        © {datetime.now().year} Equity Trust Portfolio
        </font>
        """
        
        elements.append(Paragraph(footer_text, self.styles['ReportSmall']))
        
        return elements


async def generate_health_report_pdf(
    db,
    user_id: str,
    trust_name: str = "Equity Trust"
) -> BytesIO:
    """
    Generate a complete Trust Health PDF report.
    
    Args:
        db: Database connection
        user_id: User ID
        trust_name: Name of the trust
    
    Returns:
        BytesIO buffer containing the PDF
    """
    from services.health_scanner import TrustHealthScanner, AuditReadinessChecker, get_health_history
    
    # Run health scan
    scanner = TrustHealthScanner(db)
    health_data = await scanner.run_full_scan(user_id)
    
    # Run audit check
    checker = AuditReadinessChecker(db)
    audit_data = await checker.run_audit_check(user_id)
    
    # Get timeline
    history = await get_health_history(db, user_id, 30)
    
    # Get recent events
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    
    records = await db.governance_records.find(
        {
            "user_id": user_id,
            "created_at": {"$gte": cutoff.isoformat()}
        },
        {"_id": 0, "id": 1, "title": 1, "module_type": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(20)
    
    events = []
    for record in records:
        events.append({
            "type": "record_created",
            "date": record.get("created_at"),
            "title": f"New {record.get('module_type', 'record')}: {record.get('title', 'Untitled')}",
        })
    
    timeline_data = {
        "history": history,
        "events": events
    }
    
    # Generate PDF
    generator = TrustHealthReportGenerator()
    return generator.generate_report(health_data, audit_data, timeline_data, trust_name)
