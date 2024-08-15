import fs from 'fs';
import path from 'path';
import keyword_extractor from 'keyword-extractor';

interface Section {
  name: string;
  requiredKeywords: string[];
  minWordCount: number;
}

interface DocumentType {
  name: string;
  sections: Section[];
  overallMinWordCount: number;
}

interface EvaluationResult {
  documentType: string;
  overallScore: number;
  sectionScores: { [key: string]: number };
  feedback: string[];
  missingKeywords: { [key: string]: string[] };
  wordCount: number;
}
const projectOverviewType: DocumentType = {
    name: 'Project Overview',
    sections: [
      { name: 'Introduction', requiredKeywords: ['purpose', 'scope', 'objectives'], minWordCount: 100 },
      { name: 'Key Features', requiredKeywords: ['functionality', 'benefits', 'unique'], minWordCount: 150 },
      { name: 'Target User', requiredKeywords: ['audience', 'user', 'demographic'], minWordCount: 75 },
      { name: 'User Access Levels', requiredKeywords: ['roles', 'permissions', 'admin'], minWordCount: 100 },
      { name: 'Purpose', requiredKeywords: ['goal', 'aim', 'objective'], minWordCount: 75 },
      { name: 'Technology Stack', requiredKeywords: ['frontend', 'backend', 'database'], minWordCount: 100 },
      { name: 'Conclusion', requiredKeywords: ['summary', 'future', 'next steps'], minWordCount: 75 },
    ],
    overallMinWordCount: 500, // Adjusted to match your document's actual word count
  };
  
  function evaluateSection(content: string, section: Section): { score: number; feedback: string; missingKeywords: string[] } {
    const sectionRegex = new RegExp(`## \\d+\\.\\s+${section.name}`, 'i');
    const sectionMatch = content.match(sectionRegex);
    if (!sectionMatch) {
      return { score: 0, feedback: `Section "${section.name}" is missing.`, missingKeywords: section.requiredKeywords };
    }
  
    const sectionContent = content.slice(sectionMatch.index);
    const nextSectionMatch = sectionContent.slice(sectionMatch[0].length).match(/## \d+\.\s+/);
    const sectionText = nextSectionMatch
      ? sectionContent.slice(0, nextSectionMatch.index! + sectionMatch[0].length)
      : sectionContent;
  
    const words = sectionText.split(/\s+/).filter(word => word.length > 0);
    const keywordsFound = extractKeywords(sectionText);
    const missingKeywords = section.requiredKeywords.filter(keyword => !keywordsFound.includes(keyword.toLowerCase()));
  
    let score = 0;
    let feedback = '';
  
    if (words.length >= section.minWordCount) {
      score += 0.5;
      feedback += `Word count requirement met (${words.length} words). `;
    } else {
      feedback += `Word count below minimum (${words.length}/${section.minWordCount}). `;
    }
  
    const keywordScore = 1 - (missingKeywords.length / section.requiredKeywords.length);
    score += keywordScore * 0.5;
  
    if (missingKeywords.length === 0) {
      feedback += 'All required keywords found. ';
    } else {
      feedback += `Missing keywords: ${missingKeywords.join(', ')}. `;
    }
  
    return { score, feedback, missingKeywords };
  }

function readDocument(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function extractKeywords(text: string): string[] {
  return keyword_extractor.extract(text, {
    language: 'english',
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true,
  });
}


function evaluateDocument(content: string, documentType: DocumentType): EvaluationResult {
  const words = content.split(/\s+/).filter(word => word.length > 0);
  const sectionScores: { [key: string]: number } = {};
  const feedback: string[] = [];
  const missingKeywords: { [key: string]: string[] } = {};

  let overallScore = 0;

  documentType.sections.forEach(section => {
    const { score, feedback: sectionFeedback, missingKeywords: sectionMissingKeywords } = evaluateSection(content, section);
    sectionScores[section.name] = score;
    feedback.push(`${section.name}: ${sectionFeedback}`);
    if (sectionMissingKeywords.length > 0) {
      missingKeywords[section.name] = sectionMissingKeywords;
    }
    overallScore += score;
  });

  overallScore /= documentType.sections.length;

  if (words.length >= documentType.overallMinWordCount) {
    overallScore += 0.1;
    feedback.push(`Overall word count requirement met (${words.length} words).`);
  } else {
    feedback.push(`Overall word count below minimum (${words.length}/${documentType.overallMinWordCount}).`);
  }

  return {
    documentType: documentType.name,
    overallScore: Math.min(overallScore, 1) * 100,
    sectionScores,
    feedback,
    missingKeywords,
    wordCount: words.length,
  };
}

function generateReport(result: EvaluationResult): string {
  return `
Document Evaluation Report
==========================
Document Type: ${result.documentType}
Overall Score: ${result.overallScore.toFixed(2)}%
Total Word Count: ${result.wordCount}

Section Scores:
${Object.entries(result.sectionScores)
  .map(([section, score]) => `- ${section}: ${(score * 100).toFixed(2)}%`)
  .join('\n')}

Feedback:
${result.feedback.map(item => `- ${item}`).join('\n')}

Missing Keywords:
${Object.entries(result.missingKeywords)
  .map(([section, keywords]) => `- ${section}: ${keywords.join(', ')}`)
  .join('\n')}
`;
}

function evaluateProjectOverview(filePath: string): void {
  try {
    const content = readDocument(filePath);
    const result = evaluateDocument(content, projectOverviewType);
    const report = generateReport(result);

    const outputPath = path.join(path.dirname(filePath), 'evaluation_report.txt');
    fs.writeFileSync(outputPath, report);
    console.log(`Evaluation report generated: ${outputPath}`);
    console.log(report);  // Also log the report to the console
  } catch (error) {
    console.error(`Error evaluating document: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Evaluate the project-overview.md file
const filePath = path.join(__dirname, 'project-overview.md');
evaluateProjectOverview(filePath);







