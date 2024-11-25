import {Request, RequestHandler, Response} from "express";

/*
    Nampespace que contém tudo sobre "contas de usuários"
*/
export namespace AccountsHandler {
    
    /**
     * Tipo UserAccount
     */
    export type UserAccount = {
        name:string;
        email:string;
        password:string;
        birthdate:string; 
        isAdmin:boolean;
    };

    
    const pool = require('../db/db');

    // Array que representa uma coleção de contas. 
    let accountsDatabase: UserAccount[] = [];

    /**
     * Salva uma conta no banco de dados. 
     * @param ua conta de usuário do tipo @type {UserAccount}
     * @returns @type { number } o código da conta cadastrada como posição no array.
     */
    export async function saveNewAccount(ua: UserAccount): Promise<number> {
        const query = `
            INSERT INTO UserAccount (name, email, password, birthdate, isAdmin)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const values = [ua.name, ua.email, ua.password, ua.birthdate, ua.isAdmin];
        const result = await pool.query(query, values);
        return result.rows[0].id; // Retorna o ID gerado.
    }


      /**
     * Verifica se o e-mail e senha correspondem a uma conta existente.
     * @param email Email do usuário
     * @param password Senha do usuário
     * @returns @type { boolean } true se as credenciais forem válidas, false caso contrário.
     */
    export function authenticateUser(email: string, password: string): boolean {
        return accountsDatabase.some(
            account => account.email === email && account.password === password
        );
    }

    /**
     * Função para tratar a rota HTTP /signUp. 
     * @param req Requisição http tratada pela classe @type { Request } do express
     * @param res Resposta http a ser enviada para o cliente @type { Response }
     */
    export const createAccountRoute: RequestHandler = (req: Request, res: Response) => {
        // Passo 1 - Receber os parametros para criar a conta
          const { name, email, password, birthdate, isAdmin } = req.body;

        if (name && email && password && birthdate) {

            // Validar que o birthdate não está no futuro
            const birthDateObj = new Date(birthdate);
            const currentDate = new Date();

            if (isNaN(birthDateObj.getTime())) {
                res.status(400).send("Data de nascimento inválida.");
                return;
            }

            if (birthDateObj > currentDate) {
                res.status(400).send("Data de nascimento não pode estar no futuro.");
                return;
            }

            // Prosseguir com o cadastro
            const newAccount: UserAccount = {
                name,
                email,
                password,
                birthdate,
                isAdmin
            };           
            const ID = saveNewAccount(newAccount);
            res.status(200).send(`Nova conta adicionada. Código: ${ID}`);
        }else{
            res.status(400).send("Parâmetros inválidos ou faltantes.");
        }
    }

    export const loginRoute: RequestHandler = (req: Request, res: Response) => {
       //receber parametros
       const { email, password } = req.body;

       if (email && password) {
            const isAuthenticated = authenticateUser(email, password);
            if (isAuthenticated) {
                res.status(200).send("Login bem-sucedido!");
            } else {
                res.status(401).send("Credenciais inválidas.");
            }
        } else {
            res.status(400).send("Parâmetros de login faltando.");
        }
    };
}
