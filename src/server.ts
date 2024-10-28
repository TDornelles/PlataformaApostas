import express from "express";
import {Request, Response, Router} from "express";
import { AccountsHandler } from "./accounts/accounts";
import { EventsHandler } from "./events/events";

const port = 3000; 
const server = express();
const routes = Router();

server.use(express.json());

// definir as rotas. 
// a rota tem um verbo/método http (GET, POST, PUT, DELETE)
routes.get('/', (req: Request, res: Response)=>{
    res.statusCode = 403;
    res.send('Acesso não permitido.');
});

//rota para cadastro
routes.put('/signUp', AccountsHandler.createAccountRoute);

//rota para login
routes.post('/login', AccountsHandler.loginRoute)

//rota para criação de evnetos
routes.post('/addNewEvent', EventsHandler.addNewEventRoute);

server.use(routes);

server.listen(port, ()=>{
    console.log(`Server is running on: ${port}`);
})
