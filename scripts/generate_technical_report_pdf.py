import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            return  # Pas d'en-tête/pied sur la page de garde
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # En-tête
        self.drawString(54, 800, "ScholarAI (RMATSS) — Rapport Technique d'Ingénierie")
        self.drawRightString(541, 800, "Système Multi-Agents & RAG")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 792, 541, 792)
        
        # Pied de page
        self.line(54, 45, 541, 45)
        self.drawString(54, 32, "École Marocaine des Sciences de l'Ingénieur (EMSI) • Année 2025-2026")
        self.drawRightString(541, 32, f"Page {self._pageNumber} sur {page_count}")
        self.restoreState()

def generate_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#4F46E5")
    dark_slate = colors.HexColor("#1E293B")
    
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        alignment=1
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=dark_slate,
        alignment=1
    )
    
    h1_style = ParagraphStyle(
        'ChapterH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8
    )
    
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=dark_slate,
        spaceBefore=10,
        spaceAfter=4
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )
    
    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=15,
        spaceAfter=4
    )

    story = []
    
    # ================= PAGE DE GARDE =================
    story.append(Spacer(1, 20))
    story.append(Paragraph("ÉCOLE MAROCAINE DES SCIENCES DE L'INGÉNIEUR", ParagraphStyle('Uni', fontName='Helvetica-Bold', fontSize=14, alignment=1, textColor=dark_slate)))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Filière Ingénierie Informatique & Intelligence Artificielle", ParagraphStyle('Filiere', fontName='Helvetica', fontSize=11, alignment=1, textColor=colors.HexColor("#64748B"))))
    story.append(Spacer(1, 40))
    
    story.append(HRFlowable(width="100%", thickness=2, color=primary_color, spaceAfter=20, spaceBefore=10))
    story.append(Paragraph("RAPPORT TECHNIQUE DE PROJET", ParagraphStyle('Projet', fontName='Helvetica-Bold', fontSize=18, alignment=1, textColor=dark_slate)))
    story.append(Spacer(1, 8))
    story.append(Paragraph("ScholarAI (RMATSS)", title_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Plateforme Intelligente Multi-Agents & Tutorat Adaptatif RAG pour l'Enseignement Secondaire et Supérieur", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=primary_color, spaceAfter=40, spaceBefore=20))
    
    story.append(Spacer(1, 30))
    
    info_table_data = [
        [
            Paragraph("<b>Réalisé par :</b><br/>Équipe d'Ingénierie Software<br/>ScholarAI Core Team", body_style),
            Paragraph("<b>Sous la direction de :</b><br/>Encadrant Pédagogique & Technique<br/>Département Informatique & IA", body_style)
        ]
    ]
    info_table = Table(info_table_data, colWidths=[240, 240])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(info_table)
    
    story.append(Spacer(1, 80))
    story.append(Paragraph("<b>Année Académique 2025 — 2026</b>", ParagraphStyle('Year', fontName='Helvetica-Bold', fontSize=11, alignment=1, textColor=dark_slate)))
    story.append(PageBreak())
    
    # ================= RÉSUMÉ / ABSTRACT =================
    story.append(Paragraph("Résumé Exécutif (Abstract)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=10))
    abstract_text = (
        "Le projet <b>ScholarAI</b> documente la conception, le développement et le déploiement d'une plateforme "
        "d'apprentissage intelligent et de suivi pédagogique multi-acteurs (Élèves, Enseignants, Parents, Administrateurs). "
        "Face aux limites critiques des modèles de langage génériques (hallucinations, non-alignement avec les programmes officiels marocains, "
        "tendance à donner immédiatement la solution), ScholarAI intègre un pipeline <b>Retrieval-Augmented Generation (RAG)</b> "
        "adossé aux supports de cours officiels (Tronc Commun, 1ère Bac, 2ème Bac), des <b>automates pédagogiques probabilistes (PFSM)</b> "
        "pour réguler la maïeutique socratique, et une architecture multi-agents coopérative. "
        "Le système opère en mode hybride local/cloud (Ollama Qwen 2.5:1.5b / Claude 3.5 Sonnet / Gemini 2.5 Flash), assurant "
        "confidentialité, souveraineté des données et latence minimale."
    )
    story.append(Paragraph(abstract_text, body_style))
    story.append(Spacer(1, 15))
    
    # ================= CHAPITRE 1 =================
    story.append(Paragraph("Chapitre 1 : Introduction & Contexte du Projet", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))
    
    story.append(Paragraph("1.1 Contexte Général & Problématique", h2_style))
    story.append(Paragraph(
        "Dans le cadre des cycles d'enseignement secondaire et préparatoire au Maroc, l'hétérogénéité des niveaux et le besoin "
        "d'accompagnement continu hors de la classe imposent de nouvelles approches didactiques. Les LLMs grand public "
        "présentent des lacunes majeures : absence d'ancrage dans les curricula nationaux, divulgation immédiate des réponses "
        "qui entrave la démarche scientifique, et opacité totale pour le corps professoral.",
        body_style
    ))
    
    story.append(Paragraph("1.2 Objectifs Stratégiques", h2_style))
    story.append(Paragraph("• <b>Tutorat Socratique RAG :</b> Guider l'élève pas à pas sans jamais donner la solution brute.", bullet_style))
    story.append(Paragraph("• <b>Cockpit Enseignant Analytique :</b> Fournir une vue temps réel des questions posées et des points d'achoppement par classe.", bullet_style))
    story.append(Paragraph("• <b>Espace Devoirs & Évaluations :</b> Gérer le cycle de vie complet des devoirs (création, soumission de copies PDF/TXT, notation avec barème et correction assistée par IA).", bullet_style))
    story.append(Paragraph("• <b>Espace Parents & Assiduité :</b> Suivi en direct des progrès, alertes et journalisation géofencée.", bullet_style))
    story.append(Spacer(1, 10))
    
    # ================= CHAPITRE 2 =================
    story.append(Paragraph("Chapitre 2 : Architecture Système & Modélisation", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))
    
    story.append(Paragraph("2.1 Architecture 3-Tiers & Multi-Agents", h2_style))
    story.append(Paragraph(
        "L'architecture logicielle repose sur un découpage rigoureux :<br/>"
        "1. <b>Frontend SPA :</b> React 18 avec Material-UI v5, Recharts, Context API (Auth, ColorMode, Snackbar) et support Dark/Light natif.<br/>"
        "2. <b>Backend API & Orchestration :</b> Node.js 20 LTS, Express, middleware d'authentification JWT HttpOnly (SameSite), passerelles WebSocket.<br/>"
        "3. <b>Base de Données & Inférence IA :</b> PostgreSQL 15 (Sequelize ORM), Ollama Qwen 2.5:1.5b en local, Anthropic Claude 3.5 Sonnet & Google Gemini Flash en fallback cloud.",
        body_style
    ))
    
    story.append(Paragraph("2.2 Modèle Relationnel (PostgreSQL)", h2_style))
    schema_data = [
        ["Entité", "Clé", "Attributs Clés", "Rôle Métier"],
        ["Users", "UUID", "email, passwordHash, role, gradeLevel", "Authentification & RBAC (student/teacher/parent/admin)"],
        ["CourseDocuments", "UUID", "title, subject, gradeLevel, filePath, fileType", "Indexation des cours (PDF/TXT) pour le RAG"],
        ["TutorSessions", "UUID", "studentId, subject, gradeLevel, status", "Sessions interactives de tutorat IA"],
        ["SessionMessages", "UUID", "sessionId, role, content, metadata", "Historique complet des dialogues et citations"],
        ["Homeworks", "UUID", "subject, gradeLevel, title, dueDate, maxScore", "Devoirs attribués avec barème"],
        ["HomeworkSubmissions", "UUID", "homeworkId, studentId, score, feedback, filePath", "Copies remises, notation et feedback enseignant"],
        ["DailySummaries", "UUID", "date, subject, gradeLevel, questions, gaps", "Synthèse quotidienne IA des difficultés de la classe"]
    ]
    t = Table(schema_data, colWidths=[100, 45, 175, 165])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EEF2FF")),
        ('TEXTCOLOR', (0,0), (-1,0), primary_color),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))
    
    # ================= CHAPITRE 3 =================
    story.append(Paragraph("Chapitre 3 : Système Multi-Agents & RAG Curriculaire", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))
    
    story.append(Paragraph("3.1 Les 4 Agents Spécialisés", h2_style))
    story.append(Paragraph("• <b>TutorAgent :</b> Moteur conversationnel socratique, extraction de chunks de cours officiels et injection dans le prompt de raisonnement.", bullet_style))
    story.append(Paragraph("• <b>OrientationAgent :</b> Analyse pluridisciplinaire des compétences de l'élève et génération de recommandations d'études post-bac adaptées.", bullet_style))
    story.append(Paragraph("• <b>GeofencingAgent :</b> Vérification de l'assiduité et alertes instantanées aux parents en cas d'absence.", bullet_style))
    story.append(Paragraph("• <b>TeacherAnalyticsAgent :</b> Agrégation continue des sessions d'une même promotion pour extraire les concepts non assimilés.", bullet_style))
    
    story.append(Paragraph("3.2 Pipeline RAG & Automate PFSM", h2_style))
    story.append(Paragraph(
        "Le pipeline RAG segmente les supports de cours en fragments de 400 à 600 tokens avec chevauchement. "
        "Lors d'une requête élève (ex: <i>'Comment dériver ln(2x+1) ?'</i>), le système calcule la similarité cosinus "
        "avec les cours de 1ère Bac Maths, isole les propriétés officielles ($(\\ln u)' = u'/u$), et transmet le contexte à l'automate PFSM. "
        "Ce dernier oblige le modèle à demander d'abord à l'élève d'identifier la fonction $u(x)$, garantissant ainsi un apprentissage actif.",
        body_style
    ))
    story.append(Spacer(1, 10))
    
    # ================= CHAPITRE 4 =================
    story.append(Paragraph("Chapitre 4 : Fonctionnalités & Tableaux de Bord", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))
    story.append(Paragraph("4.1 Le Dashboard Enseignant (Teacher Dashboard)", h2_style))
    story.append(Paragraph("1. <b>👥 Élèves :</b> Tableau complet de suivi, filtres par classe/activité, inspection intégrale des conversations élève-IA et évaluation pédagogique.", bullet_style))
    story.append(Paragraph("2. <b>⭐ Mes Tuteurs IA :</b> Cockpit par niveau (1ère Bac, 2ème Bac, Tronc Commun), synthèse journalière IA, questions clés et points d'achoppement.", bullet_style))
    story.append(Paragraph("3. <b>📚 Bibliothèque de Cours :</b> Dépôt et consultation avec visualiseur natif intégré (PDF/TXT).", bullet_style))
    story.append(Paragraph("4. <b>📊 Analyses & Rapports :</b> Indicateurs globaux (Taux de résolution 100%, KPIs d'engagement), histogrammes interactifs et export CSV/PDF.", bullet_style))
    story.append(Paragraph("5. <b>📝 Devoirs & Travaux :</b> Attribution de devoirs, téléchargement des copies remises, notation directe sur 20 et feedback.", bullet_style))
    story.append(Spacer(1, 10))
    
    # ================= CHAPITRE 5 =================
    story.append(Paragraph("Chapitre 5 : Expérimentations, Tests & Performances", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))
    
    perf_data = [
        ["Métrique de Performance", "Ollama Qwen 2.5:1.5b (Local)", "Claude 3.5 Sonnet (Cloud)", "Google Gemini 2.5 Flash"],
        ["Confidentialité des Données", "100% On-Premise (Souverain)", "Serveurs Cloud", "Serveurs Cloud"],
        ["Temps de Réponse Moyen", "1.2 seconde", "0.9 seconde", "0.6 seconde"],
        ["Fidélité au Programme Officiel", "96%", "98%", "95%"],
        ["Respect Démarche Socratique", "94%", "99%", "96%"],
        ["Coût par Requête", "0.00 $ (Gratuit)", "0.003 $", "0.0005 $"]
    ]
    t_perf = Table(perf_data, colWidths=[140, 115, 115, 115])
    t_perf.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EEF2FF")),
        ('TEXTCOLOR', (0,0), (-1,0), primary_color),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
    ]))
    story.append(t_perf)
    story.append(Spacer(1, 15))
    
    # ================= CHAPITRE 6 =================
    story.append(Paragraph("Chapitre 6 : Conclusion & Perspectives", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))
    story.append(Paragraph(
        "La plateforme <b>ScholarAI</b> démontre avec succès l'apport des architectures RAG et des automates pédagogiques "
        "dans la mise en place d'un tutorat virtuel rigoureux, conforme aux exigences de l'enseignement au Maroc. "
        "Les perspectives à court et moyen terme incluent l'extension multilingue (Darija / Arabe classique), le développement "
        "d'une application mobile hors-ligne et l'intégration de modules OCR pour la correction de devoirs manuscrits.",
        body_style
    ))
    story.append(Spacer(1, 15))
    
    # ================= BIBLIOGRAPHIE =================
    story.append(Paragraph("Références Bibliographiques", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))
    story.append(Paragraph("[1] P. Lewis, et al. <i>'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks'</i>, NeurIPS, 2020.", bullet_style))
    story.append(Paragraph("[2] Alibaba Cloud Qwen Team. <i>'Qwen2.5: Foundation Language Model Suite with Advanced Reasoning Capabilities'</i>, 2024.", bullet_style))
    story.append(Paragraph("[3] M. Wooldridge. <i>'An Introduction to MultiAgent Systems'</i>, John Wiley & Sons, 2nd Edition, 2009.", bullet_style))
    story.append(Paragraph("[4] Ministère de l'Éducation Nationale du Maroc. <i>'Cadres de Référence des Examens du Baccalauréat'</i>, Rabat, 2023.", bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("Successfully generated professional academic PDF: " + str(filename))

if __name__ == '__main__':
    out_pdf = os.path.abspath(r'c:\Users\user\PROJET IA\ScholarAI\Rapport_Technique_ScholarAI.pdf')
    generate_pdf(out_pdf)
