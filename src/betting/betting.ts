import { Request, Response, RequestHandler } from "express";
import { WalletHandler } from "../wallet/wallet";
import { EventsHandler } from "../events/events";

// Namespace para manuseio de apostas e eventos
export namespace BettingHandler {

    // Interface representando uma aposta
    export type Bet = {
        eventId: number;
        email: string;
        amount: number;
    };


    /**
     * Função para o serviço "Apostar em evento"
     * @param req Requisição HTTP contendo email, eventId e amount
     * @param res Resposta HTTP
     */
    export const betOnEvent: RequestHandler = (req: Request, res: Response) => {
        const { email, eventId, amount } = req.body;
        
    }

    /**
     * Função para buscar eventos por palavras-chave
     * @param req Requisição HTTP contendo o parâmetro de busca
     * @param res Resposta HTTP
     */
    export const searchEvent: RequestHandler = (req: Request, res: Response) => {
        const { keyword } = req.query;
    }
}
