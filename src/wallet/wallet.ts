import { Request, Response, RequestHandler } from "express";

// Namespace para o manuseio de operações de carteira
export namespace WalletHandler {

    // Interface representando uma carteira
    export type Wallet = {
        userId: string;    // Identificador único do usuário
        balance: number;   // Saldo disponível na carteira
    };

    // Array simulando o armazenamento das carteiras dos usuários
    let userWallets: Wallet[] = [];

    /**
     * Função para adicionar fundos à carteira de um usuário.
     * @param req Requisição HTTP contendo userId e amount
     * @param res Resposta HTTP
     */
    export const addFunds: RequestHandler = (req: Request, res: Response) => {
        const { userId, amount } = req.body;

        // Validação básica
        if (typeof userId === 'string' && typeof amount === 'number' && amount > 0) {
            // Localizar ou criar a carteira do usuário
            let userWallet = userWallets.find(wallet => wallet.userId === userId);
            if (!userWallet) {
                userWallet = { userId, balance: 0 };
                userWallets.push(userWallet);
            }

            // Adicionar fundos à carteira
            userWallet.balance += amount;
            res.status(200).send(`Fundos adicionados com sucesso. Novo saldo: ${userWallet.balance}`);
        } else {
            res.status(400).send("Parâmetros inválidos.");
        }
    };

    /**
     * Função para retirar fundos da carteira de um usuário.
     * @param req Requisição HTTP contendo userId e amount
     * @param res Resposta HTTP
     */
    export const withdrawFunds: RequestHandler = (req: Request, res: Response) => {
        const { userId, amount } = req.body;

        // Validação básica
        if (typeof userId === 'string' && typeof amount === 'number' && amount > 0) {
            // Localizar a carteira do usuário
            const userWallet = userWallets.find(wallet => wallet.userId === userId);
            if (userWallet) {
                // Verificar se há saldo suficiente
                if (userWallet.balance >= amount) {
                    userWallet.balance -= amount;
                    res.status(200).send(`Fundos retirados com sucesso. Novo saldo: ${userWallet.balance}`);
                } else {
                    res.status(400).send("Saldo insuficiente.");
                }
            } else {
                res.status(404).send("Carteira não encontrada.");
            }
        } else {
            res.status(400).send("Parâmetros inválidos.");
        }
    };
}
