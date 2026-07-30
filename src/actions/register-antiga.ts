// 'use server';


// import { supabaseAdmin } from "@/lib/supabase/admin";
// import z from "zod";


// //Verificação dos dados de cadastro
// const verificaUsuario = z.object({
//   nome: z.string().min(1, "O nome é obrigatório !"),
//   sobrenome: z.string().min(1, "O sobrenome é obrigatório !"),
//   email: z.string().email('E-mail inválido'),
//   password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres !"),
// });


// export async function register(formData: FormData) {

//   //Extrai os dados que vem do formData
//   const dadosFormulario = {
//     nome: formData.get("nome"),
//     sobrenome: formData.get("sobrenome"),
//     email: formData.get("email"),
//     password: formData.get("password")
//   }

//   //Validação dos dados do formulario
//   const dadosValidados = verificaUsuario.safeParse(dadosFormulario);
//   if (!dadosValidados.success) {
//     const formatted = dadosValidados.error.format();
//     const errors: Record<string, string> = {};
//     for (const [key, value] of Object.entries(formatted)) {
//       if (key !== "_errors" && value && typeof value === "object" && "_errors" in value) {
//         const firstError = value._errors?.[0];
//         if (firstError) errors[key] = firstError;
//       }
//     }
//     return { success: false, errors, message: "Dados inválidos" };
//   }

//   const { nome, sobrenome, email, password } = dadosValidados.data;


//   // cria no auth (admin)
//   const { data: authData, error: errorCriarAuth } = await supabaseAdmin.auth.admin.createUser({
//     email,
//     password,
//     email_confirm: true, // já confirma automaticamente
//   });


//   if (errorCriarAuth) {
//     if (errorCriarAuth.message.includes("already registered")) {
//       return { success: false, message: "Esse e-mail já está cadastrado" };
//     }
//     return {
//       success: false,
//       message: "Erro ao criar usuário: " + errorCriarAuth.message,
//     };
//   }

//   const userId = authData.user?.id;
//   if (!userId) {
//     return { success: false, message: "Erro ao obter ID do usuário" };
//   }


//   // insere em usuarios
//   const { error: errorCriarUsuario } = await supabaseAdmin.schema("operon").from("usuarios").insert({
//     id: userId,
//     nome: `${nome} ${sobrenome}`,
//     role: "cliente",
//   });


//   if (errorCriarUsuario) {
//     return { success: false, message: "Erro ao inserir usuário !" };
//   }

//   // insere em clientes
//   const { error: errorCriarCliente } = await supabaseAdmin.schema("operon").from("clientes").insert({
//     nome,
//     sobrenome,
//     usuario_id: userId,
//     email,
//   });

//    if (errorCriarCliente) {
//     // Opcional: fazer rollback deletando o usuário criado e o registro em `usuarios`
//     await supabaseAdmin.schema("operon").from("usuarios").delete().eq("id", userId);
//     await supabaseAdmin.auth.admin.deleteUser(userId);
//     return { success: false, message: "Erro ao inserir cliente" };
//   }

//   return { success: true, message: "Cadastro realizado com sucesso" };
// }


