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

    // Array que representa uma coleção de contas. 
    let accountsDatabase: UserAccount[] = [];

    /**
     * Salva uma conta no banco de dados. 
     * @param ua conta de usuário do tipo @type {UserAccount}
     * @returns @type { number } o código da conta cadastrada como posição no array.
     */
    export function saveNewAccount(ua: UserAccount) : number{
        accountsDatabase.push(ua);
        return accountsDatabase.length;
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
