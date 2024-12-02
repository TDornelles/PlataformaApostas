import express from "express";
import {Request, Response, Router} from "express";
import { Client } from 'ssh2';
import fs from 'fs';
import { AccountsHandler } from "./accounts/accounts";
import { EventsHandler } from "./events/events";
import { WalletHandler } from './wallet/wallet';
import { BettingHandler } from './betting/betting';
import path from 'path';

const port = 3000; 
const server = express();
const routes = Router();

server.use(express.json());

const pool = require('./db/db');

server.use(express.static(path.join(__dirname, '../public')));
//(async () => {
//  try {
//    const result = await pool.query('SELECT NOW() AS current_time');
//    console.log('Conexão bem-sucedida:', result.rows[0].current_time);
//  } catch (err) {
//    console.error('Erro ao conectar:', err);
//  } finally {
//    pool.end(); // Encerra a conexão após o teste
//  }
//})();

// definir as rotas. 
// a rota tem um verbo/método http (GET, POST, PUT, DELETE)
routes.get('/', (req: Request, res: Response)=>{
    res.statusCode = 403;
    res.send('Acesso não permitido.');
});

//rota para cadastro
routes.put('/signUp', AccountsHandler.createAccountRoute);

//rota para login
routes.post('/login', AccountsHandler.loginRoute);

//rota para criação de eventos
routes.post('/addNewEvent', EventsHandler.addNewEventRoute);

//rota para listar eventos
routes.get('/getEvents', EventsHandler.getEventsRoute);

routes.get('/getEventsList', EventsHandler.getEventsListRoute);

routes.post('/evaluateNewEvent', EventsHandler.evaluateNewEventRoute);

routes.post('/deleteEvent', EventsHandler.deleteEventRoute);

// Rota para adicionar fundos
routes.post('/addFunds', WalletHandler.addFunds);

// Rota para sacar fundos
routes.post('/withdrawFunds', WalletHandler.withdrawFunds);

// Rota para verificar o saldo
routes.post('/checkBalance', WalletHandler.checkBalance);

// Rota para apostar em um evento
routes.post('/betOnEvent', BettingHandler.betOnEvent);

// Rota para encerrar um evento
routes.post('/finishEvent', EventsHandler.finishEventRoute);

// Rota para buscar eventos por palavras-chave
routes.get('/searchEvent', BettingHandler.searchEvent);


server.use(routes);

server.listen(port, ()=>{
    console.log(`Server is running on: ${port}`);
})
