import type { BaseComponent } from '../../../structures/BaseComponent.js';
import { TicketCreateButton } from './buttons/TicketCreateButton.js';
import { TicketClaimButton } from './buttons/TicketClaimButton.js';
import { TicketClosePromptButton } from './buttons/TicketClosePromptButton.js';
import { TicketCategorySelect } from './selects/TicketCategorySelect.js';
import { TicketOpenModal } from './modals/TicketOpenModal.js';
import { TicketCloseModal } from './modals/TicketCloseModal.js';

export {
  TicketCreateButton,
  TicketClaimButton,
  TicketClosePromptButton,
  TicketCategorySelect,
  TicketOpenModal,
  TicketCloseModal,
};

export function getTicketComponents(): BaseComponent[] {
  return [
    new TicketCreateButton(),
    new TicketClaimButton(),
    new TicketClosePromptButton(),
    new TicketCategorySelect(),
    new TicketOpenModal(),
    new TicketCloseModal(),
  ];
}
