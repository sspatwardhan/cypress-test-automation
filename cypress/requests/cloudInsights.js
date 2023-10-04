import { getUrlByName } from './apiAndNonApiUrlsMapper'

function getAllInsights() {
  return {
    method: 'GET',
    headers: { 'x-cookie': Cypress.env('tcsToken') },
    url: getUrlByName('AU_143'),
  }
}

function getInsightByName(insightName) {
  return {
    method: 'GET',
    headers: { 'x-cookie': Cypress.env('tcsToken') },
    url: `${getUrlByName('AU_143')}/${insightName}`,
  }
}

function setFavourite(body) {
  return {
    method: 'POST',
    headers: { 'x-cookie': Cypress.env('tcsToken') },
    url: getUrlByName('AU_144'),
    body: body
  }
}

function searchInsight(insightName) {
  return {
    method: 'GET',
    headers: { 'x-cookie': Cypress.env('tcsToken') },
    url: `${getUrlByName('AU_143')}?description=${insightName}`
  }
}

function viewInAsset(insightName) {
  const qs = "offset-start=&offset-end=&limit=5"
  return {
    method: 'GET',
    headers: { 'x-cookie': Cypress.env('tcsToken') },
    url: `${getUrlByName('AU_143')}/${insightName}?${qs}`
  }
}

function severityFilter(criticality) {
  return {
    method: 'GET',
    headers: { 'x-cookie': Cypress.env('tcsToken') },
    url: `${getUrlByName('AU_143')}?criticality=${criticality}`
  }
}

export { getAllInsights, getInsightByName, setFavourite, searchInsight, viewInAsset, severityFilter }






