import {Request, RequestHandler, Response} from "express";

export namespace EventsHandler {

        /**
     * Tipo Event, representando um evento aguardando aprovação.
     */
    export type Event = {
        title: string;
        description: string;
        quotaValue: number;
        bettingPeriod: {
            start: string; // Data-hora início no formato ISO
            end: string;   // Data-hora fim no formato ISO
        };
        eventDate: {
            day: number;
            month: number;
            year: number;
        };
        organizer: string;
    };

    // Array para armazenar os eventos em lista de espera para aprovação
    let pendingEvents: Event[] = [];

    /**
     * Função para adicionar um novo evento à lista de espera.
     * @param event Evento do tipo @type {Event}
     * @returns O índice do evento adicionado
     */
    export function addEventToPendingList(event: Event): number {
        pendingEvents.push(event);
        return pendingEvents.length;
    }

    /**
     * Função para tratar a rota HTTP /addNewEvent.
     * @param req Requisição HTTP do tipo @type {Request}
     * @param res Resposta HTTP do tipo @type {Response}
     */
    export const addNewEventRoute: RequestHandler = (req: Request, res: Response) => {
        const { title, description, quotaValue, bettingPeriod, eventDate, organizer } = req.body;

        // Validando os campos com as regras especificadas
        if (
            typeof title === "string" && title.length <= 50 &&
            typeof description === "string" && description.length <= 150 &&
            typeof quotaValue === "number" && quotaValue >= 1 &&
            bettingPeriod && bettingPeriod.start && bettingPeriod.end &&
            eventDate && eventDate.day && eventDate.month && eventDate.year &&
            typeof organizer === "string"
        ) {
            const newEvent: Event = {
                title,
                description,
                quotaValue,
                bettingPeriod,
                eventDate,
                organizer
            };
            const ID = addEventToPendingList(newEvent);
            res.status(200).send(`Novo evento adicionado à lista de espera. Código: ${ID}`);
        } else {
            res.status(400).send("Parâmetros inválidos ou faltantes.");
        }
    };

}
