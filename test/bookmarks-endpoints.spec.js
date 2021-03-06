const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures')


describe.only('Bookmarks Endpoints', function() {
    let db
  
    before('make knex instance', () => {
      db = knex({
        client: 'pg',
        connection: process.env.DB_URL,
      })

      app.set('db', db)

    })
  
    after('disconnect from db', () => db.destroy())
  
    before('clean the table', () => db('bookmarks_data').truncate())

  afterEach('cleanup', () => db('bookmarks_data').truncate())

  describe(`GET /bookmarks`, () => {

       context(`Given no bookmarks`, () => {
             it(`responds with 200 and an empty list`, () => {
               return supertest(app)
                 .get('/bookmarks')
                 .expect(200, [])
             })
           })


    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_data')
          .insert(testBookmarks)
      })

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .expect(200, testBookmarks)
      })
    })
  })

  describe.only(`GET /bookmarks/:id`, () => {

    context(`Given no bookmarks`, () => {
             it(`responds with 404`, () => {
               const bookmarkId = 123456
               return supertest(app)
                 .get(`/bookmarks/${bookmarkId}`)
                 .expect(404, { error: { message: `bookmark doesn't exist` } })
             })
           })
      context(`Given an XSS attack bookmark`, () => {
            const maliciousbookmark = {
              id: 911,
              title: 'Naughty naughty very naughty <script>alert("xss");</script>',
              style: 'How-to',
              content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
            }
      
            beforeEach('insert malicious bookmark', () => {
              return db
                .into('bookmarks_data')
                .insert([ maliciousbookmark ])
            })
      
            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/bookmarks/${maliciousbookmark.id}`)
                .expect(200)
                .expect(res => {
                  expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
                  expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
                })
            })
          })




    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_data')
          .insert(testBookmarks)
      })

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2
        const expectedbookmark = testBookmarks[bookmarkId - 1]
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .expect(200, expectedbookmark)
      })
    })
})

describe.only(`POST /bookmarks`, () => {
     it(`creates an bookmark, responding with 201 and the new bookmark`, function() {
      this.retries(3)
      const newBookmark = {
               title: 'Test new bookmark',
               style: 'Listicle',
               content: 'Test new bookmark content...'
             }
      return supertest(app)
        .post('/bookmarks')
        .send(newBookmark)
        .expect(201)
        .expect(res => {
         expect(res.body.title).to.eql(newBookmark.title)
         expect(res.body.style).to.eql(newBookmark.style)
         expect(res.body.content).to.eql(newBookmark.content)
         expect(res.body).to.have.property('id')
         expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
         const expected = new Date().toLocaleString('en', { timeZone: 'UTC' })
         const actual = new Date(res.body.date_published).toLocaleString()
         expect(actual).to.eql(expected)
       })
       .then(postRes =>
          supertest(app)
            .get(`/bookmarks/${postRes.body.id}`)
            .expect(postRes.body)
        )
     })

     const requiredFields = ['title', 'style', 'content']
     
        requiredFields.forEach(field => {
          const newBookmark = {
            title: 'Test new bookmark',
            style: 'Listicle',
            content: 'Test new bookmark content...'
          }
     
          it(`responds with 400 and an error message when the '${field}' is missing`, () => {
            delete newBookmark[field]
     
            return supertest(app)
              .post('/bookmarks')
              .send(newBookmark)
              .expect(400, {
                error: { message: `Missing '${field}' in request body` }
              })
          })
        })

        describe.only(`DELETE /bookmarks/:id`, () => {

          context(`Given no bookmarks`, () => {
                 it(`responds with 404`, () => {
                   const bookmarkId = 123456
                   return supertest(app)
                     .delete(`/bookmarks/${bookmarkId}`)
                     .expect(404, { error: { message: `bookmark doesn't exist` } })
                 })
               })

             context('Given there are bookmarks in the database', () => {
               const testBookmarks = makeBookmarksArray()
          
               beforeEach('insert bookmarks', () => {
                 return db
                   .into('bookmarks_data')
                   .insert(testBookmarks)
               })
          
               it('responds with 204 and removes the bookmark', () => {
                 const idToRemove = 2
                 const expectedbookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
                 return supertest(app)
                   .delete(`/bookmarks/${idToRemove}`)
                   .expect(204)
                   .then(res =>
                     supertest(app)
                       .get(`/bookmarks`)
                       .expect(expectedbookmarks)
                   )
               })
             })

   })
  })
})
