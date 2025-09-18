const express = require("express");
const { generateSlug } = require('random-word-slugs')
require("dotenv").config();
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");

const app = express();
const PORT = process.env.PORT || 9000;

app.use(express.json())

app.post('/project', (req, res) => {
    const {gitURL} = req.body;
    const projectSlug = generateSlug()

    //unqiue id using slug
    

    //spin the container
})