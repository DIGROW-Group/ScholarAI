const fs = require('fs');
const path = require('path');
const { CourseDocument, User } = require('../models');

async function addIntegralsDoc() {
  try {
    const teacher = await User.findOne({ where: { role: 'teacher' } });
    if (!teacher) {
      console.error('Teacher not found');
      return;
    }

    const filePath = path.resolve(__dirname, '../../../uploads/support_cours_maths_integrales.txt');
    const content = `==================================================
SUPPORT DE COURS : CHAPITRE 5 - LES INTÉGRALES ET CALCUL D'AIRES
PROFESSEUR : Prof. Drissi (EMSI)
MATIÈRE : Mathématiques
==================================================

1. DÉFINITION ET FORMULE FONDAMENTALE
Si F est une primitive de f sur [a, b], l'intégrale de a à b est :
   Integral(a à b, f(x) dx) = [F(x)]_a^b = F(b) - F(a)

2. INTÉGRATION PAR PARTIES (IPP)
Formule officielle du cours du Professeur Drissi :
   Integral(u(x) * v'(x) dx) = u(x) * v(x) - Integral(u'(x) * v(x) dx)

Méthode de choix ALPES pour poser u(x) dans l'intégration par parties :
  A : Arc-tangente
  L : Logarithme népérien ln(x)
  P : Polynôme (ex: x, x^2)
  E : Exponentielle (ex: e^x)
  S : Sinus / Cosinus

3. EXEMPLE DU COURS DU PROF. DRISSI : Integral(x * e^x dx)
  - Poser u(x) = x  ==> u'(x) = 1
  - Poser v'(x) = e^x ==> v(x) = e^x
  - Application IPP : Integral(x * e^x dx) = x * e^x - Integral(e^x dx) = (x - 1) * e^x + C
`;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✓ Created course file:', filePath);

    const doc = await CourseDocument.create({
      teacherId: teacher.id,
      subject: 'math',
      title: "Chapitre 5 - Les Intégrales et Calcul d'Aires (Prof. Drissi)",
      description: "Support officiel sur les intégrales définies, méthode ALPES et intégration par parties",
      filePath: filePath,
      fileType: 'text/plain',
      chapter: 'Intégrales et Primitives',
      guidelines: "Rappeler systématiquement la méthode ALPES du professeur Drissi pour choisir u(x) dans l'intégration par parties.",
      isProcessed: true,
      tags: ['integrales', 'primitives', 'ipp', 'drissi', 'alpes']
    });

    console.log("✅ Created CourseDocument in DB with ID:", doc.id);
    console.log("Title:", doc.title);
  } catch (err) {
    console.error("Error generating document:", err);
  }
}

addIntegralsDoc();
