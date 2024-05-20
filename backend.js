


// const { StateGraph } = require('langchain');

class EmailAgents {
  makeCategorizerAgent(initialEmail) {
    // implement categorizer agent logic here
  }

  makeResearcherRouter(initialEmail, emailCategory) {
    // implement researcher router logic here
  }

  actualReplyToConversation(initialEmail, emailCategory, researchInfo) {
    // implement actual reply to conversation logic here
  }

  qualityControlAgent(initialEmail, emailCategory, researchInfo, draftEmail) {
    // implement quality control agent logic here
  }

  finalResponse(initialEmail, emailCategory, researchInfo, draftEmail, emailAnalysis) {
    // implement final response logic here
  }
}

class GraphState {
  constructor() {
    this.initialEmail = '';
    this.emailCategory = '';
    this.draftEmail = '';
    this.finalEmail = '';
    this.researchInfo = [];
    this.infoNeeded = false;
    this.numSteps = 0;
    this.draftEmailFeedback = {};
    this.ragQuestions = [];
  }
}

function categorizeEmail(state) {
  console.log('---CATEGORIZING INITIAL EMAIL---');
  const initialEmail = state.initialEmail;
  let numSteps = state.numSteps;
  numSteps += 1;

  const emailCategory = new EmailAgents().makeCategorizerAgent(initialEmail);
  console.log(emailCategory);

  return { emailCategory, numSteps };
}

function researchInfoSearch(state) {
  console.log('---RESEARCH INFO RAG---');
  const initialEmail = state.initialEmail;
  const emailCategory = state.emailCategory;
  let numSteps = state.numSteps;
  numSteps += 1;

  const questions = new EmailAgents().makeResearcherRouter(initialEmail, emailCategory);
  const ragResults = [];
  for (const question of questions) {
    console.log(question);
    // implement RAG logic here
    // const tempDocs = ragChain.invoke(question);
    // const questionResults = `${question}\n\n${tempDocs}\n\n\n`;
    // if (ragResults) {
    //   ragResults.push(questionResults);
    // } else {
    //   ragResults = [questionResults];
    // }
  }

  return { researchInfo: ragResults, ragQuestions: questions, numSteps };
}

function draftEmailWriter(state) {
  console.log('---DRAFT EMAIL WRITER---');
  const initialEmail = state.initialEmail;
  const emailCategory = state.emailCategory;
  const researchInfo = state.researchInfo;
  let numSteps = state.numSteps;
  numSteps += 1;

  const draftEmail = new EmailAgents().actualReplyToConversation(initialEmail, emailCategory, researchInfo);
  console.log(draftEmail);

  return { draftEmail: draftEmail.emailDraft, numSteps };
}

function analyzeDraftEmail(state) {
  console.log('---DRAFT EMAIL ANALYZER---');
  const initialEmail = state.initialEmail;
  const emailCategory = state.emailCategory;
  const draftEmail = state.draftEmail;
  const researchInfo = state.researchInfo;
  let numSteps = state.numSteps;
  numSteps += 1;

  const draftEmailFeedback = new EmailAgents().qualityControlAgent(initialEmail, emailCategory, researchInfo, draftEmail);
  return { draftEmailFeedback, numSteps };
}

function rewriteEmail(state) {
  console.log('---REWRITE EMAIL ---');
  const initialEmail = state.initialEmail;
  const emailCategory = state.emailCategory;
  const draftEmail = state.draftEmail;
  const researchInfo = state.researchInfo;
  const draftEmailFeedback = state.draftEmailFeedback;
  let numSteps = state.numSteps;
  numSteps += 1;

  const finalEmail = new EmailAgents().finalResponse(initialEmail, emailCategory, researchInfo, draftEmail, draftEmailFeedback);
  return { finalEmail, numSteps };
}

function routeToRewrite(state) {
  console.log('---ROUTE TO REWRITE---');
  const initialEmail = state.initialEmail;
  const emailCategory = state.emailCategory;
  const draftEmail = state.draftEmail;

  const router = new EmailAgents().actualReplyToConversation(initialEmail, emailCategory, draftEmail);
  console.log(router);
  if (router.routerDecision === 'rewrite') {
    console.log('---ROUTE TO ANALYSIS - REWRITE---');
    return 'rewrite';
  } else if (router.routerDecision === 'no_rewrite') {
    console.log('---ROUTE EMAIL TO FINAL EMAIL---');
    return 'no_rewrite';
  }
}

// Build the graph
const workflow = new StateGraph(GraphState);

// Define the nodes
workflow.addNode('categorizeEmail', categorizeEmail);
workflow.addNode('researchInfoSearch', researchInfoSearch);
workflow.addNode('draftEmailWriter', draftEmailWriter);
workflow.addNode('analyzeDraftEmail', analyzeDraftEmail);
workflow.addNode('rewriteEmail', rewriteEmail);

// Add edges
workflow.setEntryPoint('categorizeEmail');

workflow.addEdge('categorizeEmail', 'draftEmailWriter');
workflow.addEdge('draftEmailWriter', 'analyzeDraftEmail');
workflow.addEdge('analyzeDraftEmail', 'rewriteEmail');
workflow.addEdge('rewriteEmail', 'END');

const app = workflow.compile();

// Run the graph
const email = 'HI there, \nI am a big fan of westworld.\nCan I meet Maeve in the park? Really want to chat with her.\nThanks,\nRingo';
const inputs = { initialEmail: email, numSteps: 0 };
const output = app.invoke(inputs);

console.log(output.finalEmail);

