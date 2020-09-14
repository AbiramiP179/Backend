const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const e = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const db = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        user: 'postgres',
        password: 'test',
        database: 'test'
    }
  });


const app= express();
app.use(express.json());
app.use(cors());

app.get('/',(req, res)=> {
    res.send('hi');
})

app.post('/signin', (req, res) => {

    const { email, password }=req.body;

    if(!email || !password)
    {return res.status(400).json('incorrect form submission')}

    db.select('email', 'password').from('user2')
      .where('email', '=', email)
      .then(data => {
        const isValid = bcrypt.compareSync(password, data[0].password);
        if (isValid) {
          return db.select('*').from('user2')
            .where('email', '=', email)
            .then(user => {
              res.json(user[0])
            })
            .catch(err => res.status(400).json('unable to get user'))
        } else {
          res.status(400).json('wrong credentials')
        }
      })
      .catch(err => res.status(400).json('wrong credentials'))
  })

app.post('/register', (req,res)=> {
    const { email, name, password }=req.body;

    if(!email || !name || !password)
    {return res.status(400).json('incorrect form submission')}

    const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            name: name,
            email: email,
            password: hash
        })
        .into('user2')
        .returning('*')
        .then( loginEmail => {
            res.json(loginEmail[0]);
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to join'))
})



app.listen(5000, ()=> {
    console.log('App is perfect');
})