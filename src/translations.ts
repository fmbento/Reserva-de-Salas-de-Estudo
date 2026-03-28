export type Language = 'pt' | 'en';

export interface TranslationKeys {
  loginTitle: string;
  loginTitleMobile: string;
  loginSubtitle: string;
  registerSubtitle: string;
  verifySubtitle: string;
  emailLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  receiveOtp: string;
  verifyOtp: string;
  register: string;
  backToLogin: string;
  noAccount: string;
  hasAccount: string;
  otpSent: string;
  invalidOtp: string;
  loginSuccess: string;
  registerSuccess: string;
  errorOccurred: string;
  
  // Navigation & General
  navMap: string;
  navMyReservations: string;
  navSchedules: string;
  navBackoffice: string;
  systemTitle: string;
  sidebarTitle: string;
  uaTitle: string;
  libraryInfo: string;
  settings: string;
  logout: string;
  searchPlaceholder: string;
  noRoomsFound: string;
  account: string;
  invalidEmail: string;
  connectionError: string;
  restrictedDomain: string;
  enter: string;
  search: string;
  resendCode: string;
  helpAccess: string;
  accountNotFound: string;
  emailAlreadyRegistered: string;
  otpSentSuccess: string;
  otpSentError: string;
  incorrectOtp: string;
  expiredOtp: string;
  incompleteBookingData: string;
  incompleteRoomData: string;
  roomIdAlreadyExists: string;
  userNotFoundInDb: string;
  userNotFoundLoginAgain: string;
  roomNotFound: string;
  overlappingReservationUser: string;
  overlappingReservationRoom: string;
  enterOtp: string;
  incorrectOtpFrontend: string;
  errorRequestOtp: string;
  errorBooking: string;
  errorDeleteReservation: string;
  userNotFound: string;
  internalServerError: string;
  errorUpdateStatus: string;
  smartScreen: string;
  deptInformatics: string;
  viewWeek: string;
  pastBookingError: string;
  overlapUserLongError: string;
  sessionExpiredError: string;
  timeConflict: string;
  bookingSuccess: string;
  subjectPlaceholder: string;
  durationLabel: string;
  conflictModalTitle: string;
  roomAvailableUntil: string;
  acceptReducedDuration: string;
  userReservationEndsAt: string;
  changeStartTimeTo: string;
  userReservationStartsAt: string;
  reduceDurationTo: string;
  yesAcceptChange: string;
  noCancelRequest: string;
  confirmDeletion: string;
  confirmDeletionText: string;
  cancel: string;
  delete: string;
  errorCreatingBooking: string;
  errorUpdatingRoom: string;
  errorCreatingRoom: string;
  confirmBooking: string;
  checkingAvailability: string;
  checking: string;
  reservation: string;
  searchSelectRoom: string;
  reservationDeletedSuccess: string;
  reservationApprovedSuccess: string;
  reservationRejectedSuccess: string;
  roomUpdatedSuccess: string;
  roomCreatedSuccess: string;
  userUpdatedSuccess: string;
  simulateUser: string;

  // User Management
  manageUsers: string;
  manageUsersSubtitle: string;
  searchUserPlaceholder: string;
  userRole: string;
  roleUser: string;
  roleLibrarian: string;
  roleBlocked: string;
  updateRole: string;
  userBlockedError: string;
  noUserFound: string;

  // Room Details & Booking
  capacity: string;
  pax: string;
  amenities: string;
  bookThisSpace: string;
  roomMaintenance: string;
  roomInactive: string;
  subjectLabel: string;
  dateLabel: string;
  startTime: string;
  minutes: string;
  totalDuration: string;
  bookingError: string;
  selectDate: string;
  
  // Status
  statusAvailable: string;
  statusPending: string;
  statusConfirmed: string;
  statusOccupied: string;
  statusCancelled: string;
  statusCompleted: string;
  statusMaintenance: string;
  statusInactive: string;
  status: string;

  // Reservations View
  myReservations: string;
  reservationsSubtitle: string;
  activeReservations: string;
  completedReservations: string;
  noReservations: string;
  noReservationsSubtitle: string;
  noFutureReservations: string;
  bookNow: string;
  cancelReservation: string;
  deleteReservation: string;
  confirmCancel: string;
  confirmDelete: string;
  newReservation: string;
  
  // Schedules View
  schedules: string;
  schedulesSubtitle: string;
  today: string;
  tomorrow: string;
  duration: string;
  hello: string;
  codeExpires: string;
  hourLabel: string;
  hoursLabel: string;
  minutesLabel: string;
  andLabel: string;

  // Backoffice
  backofficeTitle: string;
  backofficeSubtitle: string;
  manageRooms: string;
  manageRoomsSubtitle: string;
  addNewRoom: string;
  manageReservations: string;
  allRooms: string;
  allReservations: string;
  roomName: string;
  department: string;
  actions: string;
  edit: string;
  activate: string;
  deactivate: string;
  maintenance: string;
  save: string;
  editDetails: string;
  editing: string;
  roomImage: string;
  uploadPhoto: string;
  imageUrlPlaceholder: string;
  statusControl: string;
  activateRoom: string;
  maintenanceMode: string;
  deactivateRoom: string;
  add: string;
  all: string;
  active: string;
  inactive: string;
  approve: string;
  reject: string;
  room: string;
  user: string;
  dateTime: string;
  subject: string;
  
  // Map Grouping
  building: string;
  floor: string;
  section: string;
  biblioteca: string;
  mediateca: string;
  front: string;
  back: string;

  // Email Translations
  emailWelcomeSubject: string;
  emailWelcomeTitle: string;
  emailWelcomeBody: string;
  emailOtpSubject: string;
  emailOtpTitle: string;
  emailOtpBody: string;
  emailReservationSubject: string;
  emailReservationBody: string;
  emailReservationPendingSubject: string;
  emailReservationPendingTitle: string;
  emailReservationPendingBody: string;
  emailReservationConfirmedSubject: string;
  emailReservationConfirmedTitle: string;
  emailReservationConfirmedBody: string;
  emailReservationCancelledSubject: string;
  emailReservationCancelledTitle: string;
  emailReservationCancelledBody: string;
  emailDetailsTitle: string;
  emailRoomLabel: string;
  emailDateLabel: string;
  emailTimeLabel: string;
  emailDurationLabel: string;
  emailStatusLabel: string;
  emailRoom: string;
  emailDate: string;
  emailTime: string;
  emailFooter: string;
}

export const translations: Record<Language, TranslationKeys> = {
  pt: {
    loginTitle: "Bem-vindo de volta",
    loginTitleMobile: "Login",
    loginSubtitle: "Aceda à sua conta para gerir as suas reservas de salas.",
    registerSubtitle: "Crie uma conta para começar a reservar salas.",
    verifySubtitle: "Introduza o código de 6 dígitos enviado para o seu email.",
    emailLabel: "Endereço de Email",
    nameLabel: "Nome Completo",
    namePlaceholder: "Ex: João Silva",
    receiveOtp: "Receber Código",
    verifyOtp: "Verificar Código",
    register: "Registar",
    backToLogin: "Voltar ao Login",
    noAccount: "Não tem conta?",
    hasAccount: "Já tem conta?",
    otpSent: "Código enviado para",
    invalidOtp: "Código inválido ou expirado",
    loginSuccess: "Login realizado com sucesso",
    registerSuccess: "Registo realizado com sucesso",
    errorOccurred: "Ocorreu um erro. Tente novamente.",
    
    // Navigation & General
    navMap: "Mapa de Salas",
    navMyReservations: "Minhas Reservas",
    navSchedules: "Horários",
    navBackoffice: "Backoffice",
    systemTitle: "Reserva de Salas",
    sidebarTitle: "Bibliotecas da UA",
    uaTitle: "Universidade de Aveiro",
    libraryInfo: "Biblioteca Geral • UA",
    settings: "Definições",
    logout: "Sair",
    searchPlaceholder: "Pesquisar salas ou departamentos...",
    noRoomsFound: "Nenhuma sala encontrada para a sua pesquisa.",
    account: "Conta",
    invalidEmail: "Por favor, introduza um email válido da UA.",
    connectionError: "Erro de ligação ao servidor.",
    restrictedDomain: "Apenas emails @ua.pt são permitidos.",
    enter: "Entrar",
    search: "Procurar",
    resendCode: "Não recebeu o código? Reenviar código",
    helpAccess: "Dificuldades no acesso?",
    accountNotFound: "Conta não encontrada. Por favor, registe-se primeiro.",
    emailAlreadyRegistered: "Este e-mail já está registado. Por favor, faça login.",
    otpSentSuccess: "Código enviado para o seu e-mail.",
    otpSentError: "Ocorreu um erro ao enviar o e-mail, mas o código foi gerado. Por favor, contacte o administrador ou verifique os logs.",
    incorrectOtp: "Código incorreto.",
    expiredOtp: "Código expirado.",
    incompleteBookingData: "Dados da reserva incompletos.",
    incompleteRoomData: "Dados da sala incompletos. ID e Nome são obrigatórios.",
    roomIdAlreadyExists: "Este ID de sala já existe.",
    userNotFoundInDb: "Utilizador não identificado e nenhum utilizador encontrado na base de dados.",
    userNotFoundLoginAgain: "Utilizador não encontrado. Por favor, faça login novamente.",
    roomNotFound: "Sala não encontrada.",
    overlappingReservationUser: "Já possui uma reserva ativa que se sobrepõe a este horário.",
    overlappingReservationRoom: "Esta sala já está reservada para este horário.",
    enterOtp: "Por favor, insira o código de 5 dígitos.",
    incorrectOtpFrontend: "Código incorreto.",
    errorRequestOtp: "Erro ao processar o pedido de acesso.",
    errorBooking: "Erro ao processar a reserva na base de dados.",
    errorDeleteReservation: "Falha ao eliminar a reserva.",
    userNotFound: "Utilizador não encontrado.",
    internalServerError: "Erro interno do servidor.",
    errorUpdateStatus: "Falha ao atualizar o estado.",
    smartScreen: "Ecrã Inteligente",
    deptInformatics: "Departamento de Informática",
    viewWeek: "Semana de Visualização",
    pastBookingError: "Não é possível reservar para uma data ou hora anterior à atual.",
    overlapUserLongError: "Já possui uma reserva ativa que se sobrepõe a este horário. Se desejar manter esta nova marcação, deverá primeiro apagar a(s) outra(s) reserva(s) que fez antes para parte do tempo que agora estava a marcar, e voltar a inserir a reserva pretendida.",
    sessionExpiredError: "A sua sessão expirou ou o utilizador não foi encontrado. Por favor, faça login novamente.",
    timeConflict: "Conflito de horário.",
    bookingSuccess: "Reserva efetuada com sucesso! O seu pedido está pendente de aprovação.",
    subjectPlaceholder: "Ex: Estudo de Grupo, Reunião de Projeto",
    durationLabel: "Duração",
    conflictModalTitle: "Conflito de Horário",
    roomAvailableUntil: "Esta sala só está disponível até às {time} devido a outra reserva.",
    acceptReducedDuration: "Deseja aceitar a reserva com a duração reduzida para {duration} minutos?",
    userReservationEndsAt: "Já possui outra reserva que termina às {time}.",
    changeStartTimeTo: "Deseja alterar a hora de início para as {time}?",
    userReservationStartsAt: "Já possui outra reserva que começa às {time}.",
    reduceDurationTo: "Deseja reduzir a duração desta reserva para {duration} minutos?",
    yesAcceptChange: "Sim, aceitar alteração",
    noCancelRequest: "Não, cancelar pedido",
    confirmDeletion: "Confirmar Eliminação",
    confirmDeletionText: "Tem a certeza que deseja eliminar esta reserva? Esta ação não pode ser revertida.",
    cancel: "Cancelar",
    delete: "Eliminar",
    errorCreatingBooking: "Erro ao criar reserva",
    errorUpdatingRoom: "Erro ao atualizar a sala.",
    errorCreatingRoom: "Erro ao criar a sala.",
    confirmBooking: "Confirmar Reserva",
    checkingAvailability: "A verificar disponibilidade em tempo real...",
    checking: "A verificar...",
    reservation: "Reserva",
    searchSelectRoom: "Pesquisar / Selecionar Sala",
    reservationDeletedSuccess: "Reserva eliminada com sucesso.",
    reservationApprovedSuccess: "Reserva aprovada com sucesso.",
    reservationRejectedSuccess: "Reserva recusada com sucesso.",
    roomUpdatedSuccess: "Sala atualizada com sucesso.",
    roomCreatedSuccess: "Sala criada com sucesso.",
    userUpdatedSuccess: "Utilizador atualizado com sucesso.",
    simulateUser: "Simular Utilizador",

    // User Management
    manageUsers: "Gerir Utilizadores",
    manageUsersSubtitle: "Pesquise utilizadores e altere as suas permissões ou bloqueie o acesso.",
    searchUserPlaceholder: "Pesquisar por email...",
    userRole: "Cargo / Estatuto",
    roleUser: "Utilizador (User)",
    roleLibrarian: "Bibliotecário",
    roleBlocked: "Bloqueado",
    updateRole: "Atualizar Estatuto",
    userBlockedError: "A sua conta está bloqueada. Contacte o administrador.",
    noUserFound: "Nenhum utilizador encontrado com este email.",

    // Room Details & Booking
    capacity: "Capacidade",
    pax: "pax",
    amenities: "Comodidades",
    bookThisSpace: "Reservar este Espaço",
    roomMaintenance: "Sala em Manutenção",
    roomInactive: "Sala Inativa",
    subjectLabel: "Assunto da Reserva",
    dateLabel: "Data",
    startTime: "Hora de Início",
    minutes: "minutos",
    totalDuration: "Duração Total",
    bookingError: "Erro ao efetuar reserva. Verifique a disponibilidade.",
    selectDate: "Selecione uma data",
    
    // Status
    statusAvailable: "Disponível",
    statusPending: "Pendente",
    statusConfirmed: "Confirmada",
    statusOccupied: "Ocupada",
    statusCancelled: "Cancelada",
    statusCompleted: "Concluída",
    statusMaintenance: "Manutenção",
    statusInactive: "Inativa",
    status: "Estado",

    // Reservations View
    myReservations: "Minhas Reservas",
    reservationsSubtitle: "Gerencie as suas reservas passadas e futuras.",
    activeReservations: "Reservas Ativas",
    completedReservations: "Histórico de Reservas",
    noReservations: "Sem Reservas",
    noReservationsSubtitle: "Ainda não efetuou nenhuma reserva de sala.",
    noFutureReservations: "Não tem reservas futuras agendadas.",
    bookNow: "Reservar Agora",
    cancelReservation: "Cancelar Reserva",
    deleteReservation: "Eliminar Reserva",
    confirmCancel: "Tem a certeza que deseja cancelar esta reserva?",
    confirmDelete: "Tem a certeza que deseja eliminar esta reserva?",
    newReservation: "Nova Reserva",
    
    // Schedules View
    schedules: "Horários de Salas",
    schedulesSubtitle: "Consulte a ocupação das salas ao longo do dia.",
    today: "Hoje",
    tomorrow: "Amanhã",
    duration: "duração",
    hello: "Olá",
    codeExpires: "Este código expira em 10 minutos.",
    hourLabel: "hora",
    hoursLabel: "horas",
    minutesLabel: "minutos",
    andLabel: "e",

    // Backoffice
    backofficeTitle: "Painel de Gestão",
    backofficeSubtitle: "Gestão global de salas e reservas do sistema.",
    manageRooms: "Gerir Salas",
    manageRoomsSubtitle: "Adicione, edite ou remova salas do sistema.",
    addNewRoom: "Adicionar Nova Sala",
    manageReservations: "Gerir Reservas",
    allRooms: "Todas as Salas",
    allReservations: "Todas as Reservas",
    roomName: "Nome da Sala",
    department: "Departamento",
    actions: "Ações",
    edit: "Editar",
    activate: "Ativar",
    deactivate: "Desativar",
    maintenance: "Manutenção",
    save: "Guardar Alterações",
    editDetails: "Editar Detalhes",
    editing: "A editar",
    roomImage: "Imagem da Sala",
    uploadPhoto: "Upload de Foto",
    imageUrlPlaceholder: "URL da Imagem...",
    statusControl: "Controlo de Estado",
    activateRoom: "Ativar Sala",
    maintenanceMode: "Manutenção",
    deactivateRoom: "Desativar",
    add: "Adicionar",
    all: "Todas",
    active: "Ativas",
    inactive: "Inativas",
    approve: "Aprovar",
    reject: "Rejeitar",
    room: "Sala",
    user: "Utilizador",
    dateTime: "Data e Hora",
    subject: "Assunto",
    
    // Map Grouping
    building: "Edifício",
    floor: "Piso",
    section: "Ala",
    biblioteca: "Biblioteca",
    mediateca: "Mediateca",
    front: "Frente",
    back: "Trás",

    // Email Translations
    emailWelcomeSubject: "Bem-vindo ao Sistema de Reserva de Salas UA",
    emailWelcomeTitle: "Bem-vindo, {name}!",
    emailWelcomeBody: "A sua conta foi criada com sucesso. Agora pode começar a reservar salas na Biblioteca Geral da UA.",
    emailOtpSubject: "O seu Código de Verificação",
    emailOtpTitle: "Código de Verificação",
    emailOtpBody: "Utilize o seguinte código para completar o seu acesso:",
    emailReservationSubject: "Reserva de Sala",
    emailReservationBody: "Detalhes da sua reserva de sala:",
    emailReservationPendingSubject: "Reserva Pendente: {roomName}",
    emailReservationPendingTitle: "Reserva Recebida",
    emailReservationPendingBody: "A sua reserva para a sala {roomName} foi recebida e está aguardar confirmação.",
    emailReservationConfirmedSubject: "Reserva Confirmada: {roomName}",
    emailReservationConfirmedTitle: "Reserva Confirmada!",
    emailReservationConfirmedBody: "A sua reserva para a sala {roomName} no dia {date} às {time} foi confirmada.",
    emailReservationCancelledSubject: "Reserva Cancelada: {roomName}",
    emailReservationCancelledTitle: "Reserva Cancelada",
    emailReservationCancelledBody: "A sua reserva para a sala {roomName} no dia {date} às {time} foi cancelada.",
    emailDetailsTitle: "Detalhes da Reserva:",
    emailRoomLabel: "Sala",
    emailDateLabel: "Data",
    emailTimeLabel: "Hora",
    emailDurationLabel: "Duração",
    emailStatusLabel: "Estado",
    emailRoom: "Sala",
    emailDate: "Data",
    emailTime: "Hora",
    emailFooter: "Sistema de Reserva de Salas - Universidade de Aveiro"
  },
  en: {
    loginTitle: "Welcome back",
    loginTitleMobile: "Login",
    loginSubtitle: "Access your account to manage your room reservations.",
    registerSubtitle: "Create an account to start booking rooms.",
    verifySubtitle: "Enter the 6-digit code sent to your email.",
    emailLabel: "Email Address",
    nameLabel: "Full Name",
    namePlaceholder: "Ex: John Doe",
    receiveOtp: "Get Code",
    verifyOtp: "Verify Code",
    register: "Register",
    backToLogin: "Back to Login",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    otpSent: "Code sent to",
    invalidOtp: "Invalid or expired code",
    loginSuccess: "Login successful",
    registerSuccess: "Registration successful",
    errorOccurred: "An error occurred. Please try again.",
    
    // Navigation & General
    navMap: "Room Map",
    navMyReservations: "My Reservations",
    navSchedules: "Schedules",
    navBackoffice: "Backoffice",
    systemTitle: "Room Booking",
    sidebarTitle: "UA Libraries",
    uaTitle: "University of Aveiro",
    libraryInfo: "General Library • UA",
    settings: "Settings",
    logout: "Logout",
    searchPlaceholder: "Search rooms or departments...",
    noRoomsFound: "No rooms found for your search.",
    account: "Account",
    invalidEmail: "Please enter a valid UA email.",
    connectionError: "Error connecting to the server.",
    restrictedDomain: "Only @ua.pt emails are allowed.",
    enter: "Enter",
    search: "Search",
    resendCode: "Didn't receive code? Resend code",
    helpAccess: "Having trouble accessing?",
    accountNotFound: "Account not found. Please register first.",
    emailAlreadyRegistered: "This email is already registered. Please login.",
    otpSentSuccess: "Code sent to your email.",
    otpSentError: "An error occurred while sending the email, but the code was generated. Please contact the administrator or check the logs.",
    incorrectOtp: "Incorrect code.",
    expiredOtp: "Expired code.",
    incompleteBookingData: "Incomplete booking data.",
    incompleteRoomData: "Incomplete room data. ID and Name are required.",
    roomIdAlreadyExists: "This Room ID already exists.",
    userNotFoundInDb: "User not identified and no user found in the database.",
    userNotFoundLoginAgain: "User not found. Please login again.",
    roomNotFound: "Room not found.",
    overlappingReservationUser: "You already have an active reservation that overlaps with this time.",
    overlappingReservationRoom: "This room is already reserved for this time.",
    enterOtp: "Please enter the 5-digit code.",
    incorrectOtpFrontend: "Incorrect code.",
    errorRequestOtp: "Error processing access request.",
    errorBooking: "Error processing booking in the database.",
    errorDeleteReservation: "Failed to delete reservation.",
    userNotFound: "User not found.",
    internalServerError: "Internal server error.",
    errorUpdateStatus: "Failed to update status.",
    smartScreen: "Smart Screen",
    deptInformatics: "Department of Informatics",
    viewWeek: "View Week",
    pastBookingError: "Cannot book for a date or time in the past.",
    overlapUserLongError: "You already have an active reservation that overlaps with this time. If you wish to keep this new booking, you must first delete the other reservation(s) you made before for part of the time you were now booking, and re-insert the desired reservation.",
    sessionExpiredError: "Your session has expired or the user was not found. Please login again.",
    timeConflict: "Time conflict.",
    bookingSuccess: "Booking successful! Your request is pending approval.",
    subjectPlaceholder: "Ex: Group Study, Project Meeting",
    durationLabel: "Duration",
    conflictModalTitle: "Time Conflict",
    roomAvailableUntil: "This room is only available until {time} due to another reservation.",
    acceptReducedDuration: "Do you want to accept the reservation with the duration reduced to {duration} minutes?",
    userReservationEndsAt: "You already have another reservation that ends at {time}.",
    changeStartTimeTo: "Do you want to change the start time to {time}?",
    userReservationStartsAt: "You already have another reservation that starts at {time}.",
    reduceDurationTo: "Do you want to reduce the duration of this reservation to {duration} minutes?",
    yesAcceptChange: "Yes, accept change",
    noCancelRequest: "No, cancel request",
    confirmDeletion: "Confirm Deletion",
    confirmDeletionText: "Are you sure you want to delete this reservation? This action cannot be reversed.",
    cancel: "Cancel",
    delete: "Delete",
    errorCreatingBooking: "Error creating reservation",
    errorUpdatingRoom: "Error updating room.",
    errorCreatingRoom: "Error creating room.",
    confirmBooking: "Confirm Reservation",
    checkingAvailability: "Checking availability in real-time...",
    checking: "Checking...",
    reservation: "Reservation",
    searchSelectRoom: "Search / Select Room",
    reservationDeletedSuccess: "Reservation deleted successfully.",
    reservationApprovedSuccess: "Reservation approved successfully.",
    reservationRejectedSuccess: "Reservation rejected successfully.",
    roomUpdatedSuccess: "Room updated successfully.",
    roomCreatedSuccess: "Room created successfully.",
    userUpdatedSuccess: "User updated successfully.",
    simulateUser: "Simulate User",

    // User Management
    manageUsers: "Manage Users",
    manageUsersSubtitle: "Search users and change their permissions or block access.",
    searchUserPlaceholder: "Search by email...",
    userRole: "Role / Status",
    roleUser: "User",
    roleLibrarian: "Librarian",
    roleBlocked: "Blocked",
    updateRole: "Update Status",
    userBlockedError: "Your account is blocked. Contact the administrator.",
    noUserFound: "No user found with this email.",

    // Room Details & Booking
    capacity: "Capacity",
    pax: "pax",
    amenities: "Amenities",
    bookThisSpace: "Book this Space",
    roomMaintenance: "Room in Maintenance",
    roomInactive: "Room Inactive",
    subjectLabel: "Booking Subject",
    dateLabel: "Date",
    startTime: "Start Time",
    minutes: "minutes",
    totalDuration: "Total Duration",
    bookingError: "Error making booking. Check availability.",
    selectDate: "Select a date",
    
    // Status
    statusAvailable: "Available",
    statusPending: "Pending",
    statusConfirmed: "Confirmed",
    statusOccupied: "Occupied",
    statusCancelled: "Cancelled",
    statusCompleted: "Completed",
    statusMaintenance: "Maintenance",
    statusInactive: "Inactive",
    status: "Status",

    // Reservations View
    myReservations: "My Reservations",
    reservationsSubtitle: "Manage your past and future reservations.",
    activeReservations: "Active Reservations",
    completedReservations: "Booking History",
    noReservations: "No Reservations",
    noReservationsSubtitle: "You haven't made any room reservations yet.",
    noFutureReservations: "You have no future reservations scheduled.",
    bookNow: "Book Now",
    cancelReservation: "Cancel Reservation",
    deleteReservation: "Delete Reservation",
    confirmCancel: "Are you sure you want to cancel this reservation?",
    confirmDelete: "Are you sure you want to delete this reservation?",
    newReservation: "New Reservation",
    
    // Schedules View
    schedules: "Room Schedules",
    schedulesSubtitle: "Check room occupancy throughout the day.",
    today: "Today",
    tomorrow: "Tomorrow",
    duration: "duration",
    hello: "Hello",
    codeExpires: "This code expires in 10 minutes.",
    hourLabel: "hour",
    hoursLabel: "hours",
    minutesLabel: "minutes",
    andLabel: "and",

    // Backoffice
    backofficeTitle: "Management Panel",
    backofficeSubtitle: "Global management of rooms and reservations.",
    manageRooms: "Manage Rooms",
    manageRoomsSubtitle: "Add, edit or remove rooms from the system.",
    addNewRoom: "Add New Room",
    manageReservations: "Manage Reservations",
    allRooms: "All Rooms",
    allReservations: "All Reservations",
    roomName: "Room Name",
    department: "Department",
    actions: "Actions",
    edit: "Edit",
    activate: "Activate",
    deactivate: "Deactivate",
    maintenance: "Maintenance",
    save: "Save Changes",
    editDetails: "Edit Details",
    editing: "Editing",
    roomImage: "Room Image",
    uploadPhoto: "Upload Photo",
    imageUrlPlaceholder: "Image URL...",
    statusControl: "Status Control",
    activateRoom: "Activate Room",
    maintenanceMode: "Maintenance",
    deactivateRoom: "Deactivate",
    add: "Add",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    approve: "Approve",
    reject: "Reject",
    room: "Room",
    user: "User",
    dateTime: "Date and Time",
    subject: "Subject",
    
    // Map Grouping
    building: "Building",
    floor: "Floor",
    section: "Section",
    biblioteca: "Library",
    mediateca: "Media Library",
    front: "Front",
    back: "Back",

    // Email Translations
    emailWelcomeSubject: "Welcome to UA Room Booking System",
    emailWelcomeTitle: "Welcome, {name}!",
    emailWelcomeBody: "Your account has been successfully created. You can now start booking rooms at the UA General Library.",
    emailOtpSubject: "Your Verification Code",
    emailOtpTitle: "Verification Code",
    emailOtpBody: "Use the following code to complete your access:",
    emailReservationSubject: "Room Reservation",
    emailReservationBody: "Details of your room reservation:",
    emailReservationPendingSubject: "Pending Reservation: {roomName}",
    emailReservationPendingTitle: "Reservation Received",
    emailReservationPendingBody: "Your reservation for room {roomName} has been received and is awaiting confirmation.",
    emailReservationConfirmedSubject: "Reservation Confirmed: {roomName}",
    emailReservationConfirmedTitle: "Reservation Confirmed!",
    emailReservationConfirmedBody: "Your reservation for room {roomName} on {date} at {time} has been confirmed.",
    emailReservationCancelledSubject: "Reservation Cancelled: {roomName}",
    emailReservationCancelledTitle: "Reservation Cancelled",
    emailReservationCancelledBody: "Your reservation for room {roomName} on {date} at {time} has been cancelled.",
    emailDetailsTitle: "Reservation Details:",
    emailRoomLabel: "Room",
    emailDateLabel: "Date",
    emailTimeLabel: "Time",
    emailDurationLabel: "Duration",
    emailStatusLabel: "Status",
    emailRoom: "Room",
    emailDate: "Date",
    emailTime: "Time",
    emailFooter: "Room Booking System - University of Aveiro"
  }
};
