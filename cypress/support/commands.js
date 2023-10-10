import { _threeSeconds } from '../support/utils'

Cypress.Commands.add('login', () => {
    Cypress.session.clearAllSavedSessions()
    cy.session(Cypress.env("qaUserName"), () => {
        cy.request({ method: 'POST', url: Cypress.config('baseUrl').replace('/apiHandle', '/session'), body: { "username": Cypress.env("qaUserName"), "password": Cypress.env("qaUserPassword") } })
            .then(authResponse => {
                Cypress.env('tcsToken',`token=${authResponse.body.token}`)
            }
        )
    })
})