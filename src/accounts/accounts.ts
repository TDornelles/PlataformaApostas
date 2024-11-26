import {Request, RequestHandler, Response} from "express";
import jwt from "jsonwebtoken";

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

    export const createAccountRoute: RequestHandler = async (req, res) => {
        const { name, email, password, birthdate, isAdmin } = req.body;

        // Validação básica dos parâmetros
        if (!name || !email || !password || !birthdate) {
            res.status(400).send("Parâmetros inválidos ou faltantes.");
            return; // Certifica-se de que a execução é encerrada aqui
        }

        const query = `
            INSERT INTO UserAccount (name, email, password, birthdate, isAdmin)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;

        const values = [name, email, password, birthdate, isAdmin];
        console.log("Valores enviados para o banco:", values);

        try {
            const result = await pool.query(query, values);
            console.log("Resultado da query:", result.rows);

            // Enviar o ID gerado como resposta
            const newAccountId = result.rows[0].id;
            res.status(200).send(`Nova conta adicionada com sucesso. Código: ${newAccountId}`);
        } catch (error) {
            console.error("Erro ao executar a query:", error);
            res.status(500).send("Erro ao salvar a conta no banco de dados.");
        }
    };

    export const loginRoute: RequestHandler = async (req, res) => {
        const { email, password } = req.body;
    
        // Validação básica dos parâmetros
        if (!email || !password) {
            res.status(400).send("Parâmetros de login faltando.");
            return;
        }
    
        const query = `
            SELECT id FROM UserAccount WHERE email = $1 AND password = $2;
        `;
        const values = [email, password];
    
        try {
            // Consulta ao banco de dados
            const result = await pool.query(query, values);
    
            // Verificar se o usuário foi encontrado
            if (result.rows.length === 0) {
                res.status(401).send("Credenciais inválidas.");
                return;
            }
    
            const userId = result.rows[0].id;
    
            // Login bem-sucedido
            res.status(200).send(`Login bem-sucedido! Bem-vindo, usuário ${userId}.`);
        } catch (error) {
            console.error("Erro ao executar a query:", error);
            res.status(500).send("Erro interno do servidor.");
        }
    };
    
}
