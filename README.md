# context-cats

Uma skin escura com fundo animado para o Claude (app desktop e celular): um cômodo de gatos em pixel art.

![A cena dos gatos enchendo de 1 a 12 gatos e depois esvaziando pela porta](docs/preview.gif)

Os gatos dormem, brincam e correm pelas prateleiras. O número de gatos acompanha o uso do contexto da sessão: um gato a cada 9% usados, até 12. Quando o contexto encolhe, os excedentes vão embora pela porta. A janela e a luz seguem a hora do sistema e o clima, lido de tempos em tempos. Em datas festivas o cômodo ganha enfeites.

Tudo é desenhado numa escala só: o gato sentado tem um quarto da altura da porta, a maçaneta fica a um metro do chão e o peitoril da janela na linha do lambri.

## Instalar

No prompt de uma sessão de terminal do Claude Code:

```
/plugin install context-cats --marketplace bsfraga/context-cats
```

Responda `y` para adicionar o marketplace e escolha o escopo (o de usuário vale para todas as sessões).

De um shell:

```
claude plugin install context-cats --marketplace bsfraga/context-cats
```

No app desktop, onde `/plugin` não roda: clique em + ao lado da caixa de mensagem, depois Plugins, Add marketplace com `bsfraga/context-cats`, e Add plugin.

## Comandos

- `/gatos` mostra quantos gatos há na cena e o uso de contexto.
- `/gatos <1-12>` fixa a quantidade; `/gatos auto` volta a seguir o contexto.
- `/gatos estilo <16|32>` escolhe o desenho: 16 bits (o padrão, pixels inteiros) ou 32 bits (gatos com quinas suavizadas, luz e sombra nas bordas, sombras esfumadas e iluminação do cômodo). A escolha fica guardada.
- `/gatos teste` enche a casa e, oito segundos depois, dispara a saída pela porta.
- `/gatos clima` lê o clima na hora e mostra o céu, a cidade, a temperatura, a idade da leitura e quando vem a próxima.
- `/gatos intervalo <5-180>` muda de quantos em quantos minutos o clima é lido (padrão 10); `/gatos intervalo auto` volta ao padrão.
- `/gatos cidade <nome>` fixa a cidade do clima; `/gatos cidade auto` volta à estimativa pela rede.
- `/gatos ceu <noite|aurora|dia|tarde> <limpo|parcial|nublado|chuva|tempestade|neve|neblina>` força um céu; `/gatos ceu auto` solta.
- `/gatos festa <natal|anonovo|carnaval|namorados|pascoa|junina|halloween|nenhuma>` força um enfeite; `/gatos festa auto` volta ao calendário.
- `/gatos fuso <minutos>` acerta o fuso em relação a UTC, se a fase do dia aparecer errada.

## Festas

O enfeite sai da data local e do país que o serviço de clima devolve (sem leitura, do fuso do sistema, quando ele basta):

| Festa | Quando | Onde |
| --- | --- | --- |
| Ano Novo | 30 de dezembro a 2 de janeiro | todo lugar |
| Carnaval | da sexta ao dia seguinte à terça de Carnaval | Brasil, Portugal, Itália, Espanha, Alemanha e mais onze países |
| Dia dos Namorados | 10 a 12 de junho no Brasil; 12 a 14 de fevereiro no resto | todo lugar |
| Páscoa | a semana até a segunda seguinte; data ortodoxa nos países ortodoxos | todo lugar |
| Festa Junina | 13 a 30 de junho | Brasil e Portugal |
| Halloween | 24 a 31 de outubro | todo lugar |
| Natal | 1 a 29 de dezembro | todo lugar |

Festas de calendário lunar (Ano Novo Chinês, Diwali) não estão na lista.

## Rede e privacidade

A skin consulta o [wttr.in](https://wttr.in) a cada 10 minutos (ou no intervalo escolhido) para saber o clima, o país e o horário do nascer e do pôr do sol. Se a consulta falha, tenta de novo em 1, 2, 5 e 10 minutos. A última leitura fica guardada, então várias sessões abertas dividem a mesma consulta. Por padrão a consulta não leva nenhuma localização: o serviço estima a cidade pelo IP de quem pede. Com `/gatos cidade <nome>`, o nome da cidade vai na consulta. Nada mais sai da máquina.

## Arquivos

- `hooks/looks.ts`: cores e fontes.
- `hooks/cats.ts`: a cena dos gatos.
- `hooks/sky.ts`: hora e sondagem do clima.
- `hooks/festas.ts`: calendário e enfeites das festas.
- `hooks/pixels.ts`: retângulos e sprites.
- `hooks/make-colors.js` e `hooks/make-colors.d.ts`: o gerador de paleta que acompanha a skill plugin-authoring do Claude Code, copiado sem mudanças.

O tema é feito para o modo escuro; o terminal e os editores não desenham temas.

## Licença

MIT.
