const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const e = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');


const nodemailer = require('nodemailer');
const creds = require('./config');

var transport = {
  host:'smtp.gmail.com', // e.g. smtp.gmail.com
   port: 465,
  secure: true,
  auth: {
    user: creds.USER,
    pass: creds.PASS
  }
}

var transporter = nodemailer.createTransport(transport)

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log('All works fine, congratz!');
  }
});

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

app.get('/api',(req, res)=> {
   return db.select('*').from('list').then(data => {
    res.json(data)
})
 })
app.get('/fetchsem',(req, res)=> {
   return db.select('seminarhall').from('list').then(data => {
    res.json(data[data.length-1])
})
 })

app.get('/fetchses',(req, res)=> {
   return db.select('session').from('list').then(data => {
    res.json(data[data.length-1])
})  })

   app.get('/fetchdate',(req, res)=> {
   return db.select('fromdate').from('list').then(data => {
    res.json(data[data.length-1])
})


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

app.post('/send', (req, res, next) => {
  
const { fromdate,todate,seminarhall, purposeofevent,numberofpersons,session }=req.body;



 if(!seminarhall || !purposeofevent || !numberofpersons)
    {return res.status(400).json('incorrect form submission')}
     db.select('*').from ('list').where({
  fromdate:fromdate,
  seminarhall: seminarhall,
  session:session
   })
  .then(data => {
               
           // res.json(session)

           if (data[0].session === session)
           {
             res.status(400).send('there is already a booking')
           }

           else
           {
                res.send('there is no booking')
           }
    
               })


   .catch(err =>


    db.select('email', 'seminarhall').from('faculty')
      .where('seminarhall', '=', seminarhall)
      .then(data => {
  
       db.transaction(trx => {
        trx.insert({
          //fromdate:fromdate
          email:data[0].email,
          seminarhall:data[0].seminarhall,
          purposeofevent:purposeofevent,
          numberofpersons:numberofpersons
          //session:session
        })
        .into('list')
        .returning('*')
        .then( booker => {
            //res.json(booker[0]);
             var mail = {
                  from: 'TCE',
                  to:booker[0].email,
                  subject: 'Seminar Hall Request',
                  html:"Hey There!<b>You have received a Seminar hall Request.Please log into the website to accept or decline it."
    //<b>From date:${fromdate}\nTo date:${todate}\nSeminar Hall name:${seminarhall}\nPurpose of Event:${purposeofevent}\nAccomadation:${numberofpersons}people"
                        }

            transporter.sendMail(mail, (err, data) => {
             if (err) {
                 res.json({
                  msg: 'fail'
                         })
                      } else {
                res.json({
                  msg: 'success'
                        })
                      }
                 })
        })
        .then(trx.commit)
        .catch(trx.rollback)
      }) })
        .catch(err => res.status(400).json('unable to book')) )
})

  
app.listen(5000, ()=> {
    console.log('App is perfect');
})
