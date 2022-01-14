const express = require('express');
const app = express();
const mysql = require('mysql');
const formidable = require('formidable');
const fs = require('fs');
const session = require('express-session');
const parseurl = require('parseurl');
const bcrypt = require('bcrypt');
const req = require('express/lib/request');
app.set('views', './views');
app.set('view engine', 'ejs');

app.use(express.static('public'));

// connexion à la bdd
let pool = mysql.createPool({
    connectionLimit:10000,
    host: "localhost",
    user: "root",
    password: "",
    database: "agathe_portfolio",
    //port:3306
})

// utiliser une session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 360000000 }
  }))
  
//middleware
app.use(function(req, res, next){
    //Récuperer la route demandée
    let path = parseurl(req).pathname;

    //On met les url sécurisées dans un tableau
    let protectedPath = ['/dashboard'];

    //si l'utilisateur n'est pas authentifié et que l'url est protégée alors je redirige vers l'accueil
    //sinon je dis next()
    if(req.session.role != 'admin' && protectedPath.indexOf(path) != -1){
        res.redirect('/');
    }else{
        next();
    }
})

app.use(function(req, res, next){
    //Crer une variable utilisable dans les ejs
    res.locals.role = req.session.role;
    res.locals.email = req.session.email;
    if(req.session.role == 'admin'){
        res.locals.isAdmin = true;
    }else{
        res.locals.isAdmin = false;
    }
    next();
})

/** liste des routes **/
app.get('/', function(req,res){

    pool.query('SELECT * FROM banner_card', function(error, cards, fields){

        pool.query('SELECT * FROM user', function(error, user, fields){
            console.log(error)  
            res.render('layout', {template: 'home' , user:user[0], cards:cards});
        })

    })    

})

//Supprimer un projet
app.get('/delete/:id', function(req,res){
    pool.query("DELETE FROM projets WHERE id = ?", [req.params.id], function(error,result){
        console.log(error);
        res.redirect('/admin');
    })
})

//Modifier un projet
app.get('/edit/:id', function(req,res){
    pool.query("SELECT * FROM projets WHERE id = ?",[req.params.id], function(error, proj, fields){
        console.log(error);
        res.render('layout', {template: 'edit' , proj:proj[0]});            
    })
})

app.post('/edit/:id', function(req,res){
    const form = formidable();
    form.parse(req,function(err,fields,){
        console.log(fields);

        pool.query("UPDATE projets SET title =  ? , description = ? WHERE id = ?", [fields.title, fields.content, req.params.id], function(error,fields){
            console.log(error);
            res.redirect('/dashboard');
        })

    })
})

//Page projet
app.get('/projet/:id', function(req,res){
    pool.query("SELECT title FROM projets WHERE id = ?", [req.params.id] , function(error, projets, result){
        res.render('layout', {template: 'projet' , projets:projets[0]});

    })
})

// Modifier une card ux
app.get('/card_edit/:id', function(req,res,err){
    console.log(err);
    pool.query('SELECT title, content FROM banner_card WHERE id_card = ?', [req.params.id], (function(error, card, result){
        console.log(error);
        console.log(result);
        res.render('layout', {template: 'card_edit' , card:card[0]});
    }))
})

app.post('/card_edit/:id', function(req,res){
    const form = formidable();
    form.parse(req,function(err,fields,){
        console.log(fields);

        pool.query("UPDATE banner_card SET title =  ? , content = ? WHERE id_card = ?", [fields.title, fields.content, req.params.id], function(error,fields){
            console.log(error);
            res.redirect('/#firstpart');
        })

    })
})

// Modifier banner
app.get('/user_edit', function(req,res,err){
    console.log(err);
    pool.query('SELECT * FROM user ', (function(error, user, result){
        console.log(error);
        console.log(result);
        res.render('layout', {template: 'user_edit' , user:user[0]});
    }))
})

app.post('/user_edit', function(req,res){
    const form = formidable();
    form.parse(req,function(err,fields,){
        console.log(fields);

        pool.query("UPDATE user SET name = ? , bio = ?", [fields.name, fields.bio], function(error,fields){
            console.log(error);
            res.redirect('/');
        })

    })
})

//Ajouter un projet
app.get('/add_project', function(req,res){
    res.render('layout', {template: 'add_project'});
})

//Connexion a une session
app.post('/admin', function(req,res){
    const form = formidable();
    form.parse(req,function(err,fields){
        console.log(fields);
        pool.query("SELECT email, password, role FROM user WHERE email = ?", [fields.email], function(error, admin, result){

                if(admin.length > 0){

                    //on compare les mots de passe
                    bcrypt.compare(fields.password,admin[0].password,function(err,result){
                        
                        //si le mot de passe est correct alors on crée la session et on redirige vers le BO
                        if(result){
                            req.session.role = admin[0].role;
                            req.session.user = admin[0].pseudo;
                            res.redirect('/dashboard');
                        }
                        //sinon, on affiche un message
                        else{
                            res.render('layout', {template: 'admin' ,message:'Mauvais mot de passe'});
                        }
                    })
                    
                }
                //si il n'existe pas, on affiche un message
                else{
                    res.render('layout', {template: 'admin' ,message:'Mauvais email'});
                }

            })
        })

    })

// Afficher une page admin    
app.get('/admin', function(req,res){
    res.render('layout', {template: 'admin'});
})

// Afficher le dashboard
app.get('/dashboard', function(req,res){
    pool.query('SELECT * FROM projets', function(error, dashboard, fields){
        console.log(dashboard);
        res.render('layout', {template: 'dashboard' , dashboard:dashboard});
    })
})

//Déconnexion de session
app.get('/logout', function(req, res){
    req.session.destroy(function(err){
        res.redirect('/');
    })
})


// Savoir si le server est démarré
app.listen(3000,function(){
    console.log("Serveur démarré sur le port 3000");
});