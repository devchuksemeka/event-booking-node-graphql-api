const express = require('express')
const bodyParser = require('body-parser')
const graphqlHttp = require('express-graphql')
const { buildSchema } = require('graphql')
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const Event = require('./models/event')
const User = require('./models/user')

const app = express();

app.use(bodyParser.json());

const events = eventIds => {
    return Event.find({
        _id:{$in : eventIds}
    })
    .then(events => {
        return events.map(event =>{
            return {
                ...event._doc,
                creator:user.bind(this,event.creator)
            }
        })
    })
    .catch(err => {
        throw err
    })
}
const user = userId =>{
    return User.findById(userId)
        .then(user=>{
            return {
                ...user._doc,
                createdEvents: events.bind(this,user._doc.createdEvents)
            }
        })
        .catch(err=>{
            throw err
        })
}

app.use('/graphql-api',graphqlHttp({
    schema:buildSchema(`

        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
            creator: User!
        }

        type User {
            _id: ID!
            email: String!
            password: String 
            createdEvents:[Event! ]
        }

        input EventInput {
            title:String!
            description: String!
            price: Float!
            date: String!
        }

        input UserInput {
            email: String!
            password: String!
        }

        type RootQuery {
            events: [Event!]!

        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }

        schema{
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue:{
        events: ()=>{
            return Event.find()
                
                .then(events=>{
                    return events.map(event=>{
                        return {
                            ...event._doc,
                            creator:user.bind(this,event._doc.creator)
                        }
                    })
                })
                .catch(err => {
                    console.log(err)
                });
        },
        createEvent: (args)=>{
            const event = new Event({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: +args.eventInput.price,
                date: new Date(args.eventInput.date),
                creator: '5dc6e5a67a23f35292337175',
            })
            let createdEvent;
            return event.
                save()
                .then(result=>{
                    createdEvent = { 
                        ...result._doc,
                        creator:user.bind(this,event._doc.creator)
                    }; 
                    return User.findById('5dc6e5a67a23f35292337175')
                })
                .then(user=>{
                    if(!user) throw new Error("User does not exist")
                    user.createdEvents.push(event);
                    return user.save()
                })
                .then(result=>{
                    return createdEvent;
                })
                .catch(err =>{
                    console.log(err)
                    throw err;
                })
        },
        createUser: args =>{
            return User.findOne({email:args.userInput.email})
            .then(user => {
                if(user) throw new Error('User exists already')
                return bcrypt.hash(args.userInput.password,12)
            })
            .then(hashPassword=>{
                const user = new User({
                    email:args.userInput.email,
                    password:hashPassword
                })
                return user.save()
            })
            .then(result => {
                return {...result._doc,password:null}
            })
            .catch(err=>{
                throw err
            })
            
        }
    },
    graphiql:true
}))

mongoose
    .connect(
        `mongodb+srv://${process.env.MONGO_USER}:${
            process.env.MONGO_PASSWORD
        }@cluster0-ujgvf.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
    )
    .then(()=>{
        app.listen(3000)
    })
    .catch(err => {
        console.log(err)
    });
 