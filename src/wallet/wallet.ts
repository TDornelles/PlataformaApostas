import { Request, Response, RequestHandler } from "express";

// Namespace para o manuseio de operações de carteira
export namespace WalletHandler {

    // Interface representando uma carteira
    export type Wallet = {
        userId: string;    // Identificador único do usuário
        balance: number;   // Saldo disponível na carteira
    };

    const pool = require('../db/db');

    /**
     * Função para adicionar fundos à carteira de um usuário no banco de dados.
     * @param req Requisição HTTP contendo userId e amount
     * @param res Resposta HTTP
     */
    export const addFunds: RequestHandler = async (req: Request, res: Response) => {
        const { userId, amount } = req.body;

        // Validação básica
        if (typeof userId === 'string' && typeof amount === 'number' && amount > 0) {
            try {
                // Atualizar o saldo na tabela UserAccount
                const query = `
                    UPDATE UserAccount 
                    SET balance = balance + $1
                    WHERE id = $2
                    RETURNING balance`;
                const values = [amount, userId];

                const result = await pool.query(query, values);

                if (result.rowCount > 0) {
                    const newBalance = result.rows[0].balance;
                    res.status(200).send(`Fundos adicionados com sucesso. Novo saldo: ${newBalance}`);
                } else {
                    res.status(404).send("Usuário não encontrado.");
                }
            } catch (error) {
                console.error("Erro ao adicionar fundos:", error);
                res.status(500).send("Erro ao processar a operação.");
            }
        } else {
            res.status(400).send("Parâmetros inválidos.");
        }
    };

    /**
     * Função para verificar o saldo da carteira de um usuário
     * @param req Requisição HTTP contendo userId
     * @param res Resposta HTTP 
     */
    export const checkBalance: RequestHandler = async (req: Request, res: Response) => {
        const { userId } = req.body;

        // Validação básica
        if (typeof userId === 'string') {
            try {
                // Consultar saldo na tabela UserAccount
                const query = `
                    SELECT balance 
                    FROM UserAccount
                    WHERE id = $1`;
                const values = [userId];

                const result = await pool.query(query, values);

                if (result.rowCount > 0) {
                    const balance = result.rows[0].balance;
                    res.status(200).json({
                        userId: userId,
                        balance: balance
                    });
                } else {
                    res.status(404).send("Usuário não encontrado.");
                }
            } catch (error) {
                console.error("Erro ao consultar saldo:", error);
                res.status(500).send("Erro ao processar a consulta.");
            }
        } else {
            res.status(400).send("Parâmetro userId inválido.");
        }
    };

    /**
     * Calcula a taxa de saque baseada no valor
     * @param amount Valor do saque
     * @returns Valor da taxa a ser cobrada
     */
    const calculateWithdrawTax = (amount: number): number => {
        if (amount < 100) {
            return amount * 0.04; // 4% taxa
        } else if (amount <= 1000) {
            return amount * 0.03; // 3% taxa
        } else if (amount <= 5000) {
            return amount * 0.02; // 2% taxa
        } else if (amount <= 100000) {
            return amount * 0.01; // 1% taxa
        }
        return 0; // Sem taxa acima de 100k
    };

    /**
     * Função para retirar fundos da carteira de um usuário no banco de dados.
     * @param req Requisição HTTP contendo userId e amount
     * @param res Resposta HTTP
     */
    export const withdrawFunds: RequestHandler = async (req: Request, res: Response) => {
        const { userId, amount } = req.body;

        // Validação básica
        if (typeof userId === 'string' && typeof amount === 'number' && amount > 0) {
            try {
                // Calcular taxa de saque
                const tax = calculateWithdrawTax(amount);
                const totalDebit = amount + tax;

                // Verificar saldo atual e atualizar se suficiente
                const query = `
                    UPDATE UserAccount 
                    SET balance = balance - $1
                    WHERE id = $2 AND balance >= $1
                    RETURNING balance`;
                const values = [totalDebit, userId];

                const result = await pool.query(query, values);

                if (result.rowCount > 0) {
                    const newBalance = result.rows[0].balance;
                    res.status(200).json({
                        message: "Fundos retirados com sucesso",
                        withdrawAmount: amount,
                        tax: tax,
                        totalDebited: totalDebit,
                        newBalance: newBalance
                    });
                } else {
                    // Se nenhuma linha foi atualizada, ou usuário não existe ou saldo insuficiente
                    const checkUser = await pool.query('SELECT balance FROM UserAccount WHERE id = $1', [userId]);
                    if (checkUser.rowCount === 0) {
                        res.status(404).send("Usuário não encontrado.");
                    } else {
                        res.status(400).json({
                            message: "Saldo insuficiente",
                            withdrawAmount: amount,
                            tax: tax,
                            totalRequired: totalDebit,
                            currentBalance: checkUser.rows[0].balance
                        });
                    }
                }
            } catch (error) {
                console.error("Erro ao retirar fundos:", error);
                res.status(500).send("Erro ao processar a operação.");
            }
        } else {
            res.status(400).send("Parâmetros inválidos.");
        }
    };

}
