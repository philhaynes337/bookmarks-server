const express = require('express');
const { v4: uuid } = require('uuid');
const logger = require('../logger');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const bookmarks = [
    {
        id: 1,
        title: "Thinkful",
        url: "https://www.thinkful.com",
        description: "Think outside the classroom",
        rating: 5
    },
    {
        id: 2,
        title: "Google",
        url: "https://www.google.com",
        description: "Where we find everything else",
        rating: 4
    }
]

bookmarksRouter
    .route('/bookmarks')
    .get((req, res) => {
        
        res
        .json(bookmarks);
    })
    .post(bodyParser, (req, res) => {
        const { title, url, description, rating } = req.body;

        if (!title) {
            logger.error(`Title is Required`)
            return res
                .status(400)
                .send('Invalid Data (TITLE)');
        }
        if (!url) {
            logger.error(`URL is Required`)
            return res
                .status(400)
                .send('Invalid Data (URL)')
        }
        if (!description) {
            logger.error(`Description is Required`)
            return res
                .status(400)
                .send('Invalid Data (Description)')
        }
        if (!rating) {
            logger.error(`Rating is Required`)
            return res
                .status(400)
                .send('Invalid Data (Rating)')
        }

        const id = uuid();

        const bookmark = {
            id,
            title,
            url,
            description,
            rating
        };

        bookmarks.push(bookmark);

        logger.info(`Book Mark with id ${id} has been created.`);

        res
            .status(201)
            .location(`http://localhost:8000/bookmarks/${id}`)
            .json(bookmark)

    })

    bookmarksRouter
        .route('/bookmarks/:id')
        .get((req, res) => {
            const { id } = req.params;
            const bookmark = bookmarks.find(book => book.id == id);

            if (!bookmark) {
                logger.error(`Bookmark with id ${id} not found.`);
                return res
                    .status(400)
                    .send('Bookmark Not Found');
            }

            res.json(bookmark);
        })
        .delete((req, res) => {
            const { id } = req.params;
            const bookmarkIndex = bookmarks.findIndex(book => book.id == id)

            if (bookmarkIndex === -1) {
                logger.error(`Bookmark with id ${id} not found.`);
                return res
                    .status(404)
                    .send('Not Found');
            }

            bookmarks.splice(bookmarkIndex, 1);

            logger.info(`Bookmark with id ${id} has been deleted.`)
            res
            .status(204)
            .end();

        })

        module.exports = bookmarksRouter