import {Request, RequestHandler, Response} from "express";
import {connectToSSH} from  '../server';

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

    // Array para armazenar os eventos em lista de espera para aprovação
    let approvedEvents: Event[] = [];

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

    /**
     * Função para tratar a rota HTTP /getEvents.
     * @param req Requisição HTTP do tipo @type {Request}
     * @param res Resposta HTTP do tipo @type {Response}
     */
    export const getEventsRoute: RequestHandler = (req: Request, res: Response) => {
        const { status } = req.query;
        const today = new Date();

        let filteredEvents: Event[] = [];

        if (status === "pending") {
            filteredEvents = pendingEvents;
        } else if (status === "approved") {
            filteredEvents = approvedEvents.filter(event => {
                const eventDate = new Date(event.eventDate.year, event.eventDate.month - 1, event.eventDate.day);
                return eventDate >= today;
            });
        } else if (status === "past") {
            filteredEvents = approvedEvents.filter(event => {
                const eventDate = new Date(event.eventDate.year, event.eventDate.month - 1, event.eventDate.day);
                return eventDate < today;
            });
        } else {
            res.status(400).send("Status inválido. Use 'pending', 'approved' ou 'past'.");
            return;
        }

        res.status(200).json(filteredEvents);
    };

    /**
     * Função para deletar um evento da lista.
     * @param eventId ID do evento a ser deletado.
     * @param organizer Nome do organizador que solicitou a remoção.
     */
    export function deleteEvent(eventId: number, organizer: string): boolean {
       // const eventIndex = pendingEvents.findIndex(event => event.id === eventId);

       // pendingEvents.splice(eventIndex, 1);
        return true;
    }

    /**
     * Função para tratar a rota HTTP /deleteEvent.
     * @param req Requisição HTTP do tipo @type {Request}
     * @param res Resposta HTTP do tipo @type {Response}
     */
    export const deleteEventRoute: RequestHandler = (req: Request, res: Response) => {
        const { eventId, organizer } = req.body;

        try {
            const success = deleteEvent(eventId, organizer);
            if (success) {
                res.status(200).send(`Evento com ID ${eventId} deletado com sucesso.`);
            } else {
                res.status(404).send("Evento não encontrado.");
            }
        } catch (error) {
            res.status(400).send("Erro desconhecido.");
        }
    };

    /**
     * Função para avaliar um evento e decidir se será aprovado ou rejeitado.
     * @param req Requisição HTTP do tipo @type {Request}
     * @param res Resposta HTTP do tipo @type {Response}
     */
    export const evaluateNewEventRoute: RequestHandler = (req: Request, res: Response) => {
        const { id, approve } = req.body;

        // Validar se o ID é um número válido
        if (typeof id !== "number" || id <= 0 || id > pendingEvents.length) {
            res.status(400).send("ID inválido ou fora dos limites.");
            return;
        }

        const eventIndex = id - 1;
        const event = pendingEvents[eventIndex];

        if (approve === true) {
            // Aprovar evento e mover para a lista de eventos aprovados
            approvedEvents.push(event);
            pendingEvents.splice(eventIndex, 1);
            res.status(200).send(`Evento ID ${id} aprovado com sucesso.`);
        } else if (approve === false) {
            // Rejeitar evento e removê-lo da lista de pendentes
            pendingEvents.splice(eventIndex, 1);
            res.status(200).send(`Evento ID ${id} rejeitado e removido da lista de espera.`);
        } else {
            res.status(400).send("Parâmetro de aprovação inválido.");
        }
    };
}
