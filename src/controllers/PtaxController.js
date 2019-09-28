const mongoose = require('mongoose');
// const fetch = require("node-fetch");
const axios = require('axios');

const Ptax = mongoose.model('Ptax');

module.exports = {
	async index(req, res){
		try {
			const ptax = await Ptax.find().sort({
				dia: -1
			});

			return res.json(ptax);
		} catch(err) {
			return res.status(400).json({
				msg: err
			});
		}
	},
	async show(req, res){
		try {
			const ptax = await Ptax.find({
				dia: req.params.dia
			});

			ptax.length > 0 ? res.json(ptax) : res.status(400).json({msg: "dia inexistente"});
			
		} catch(err) {
			return res.status(400).json({
				msg: err
			});
		}
	},

	//coleta o dia atraves da api do bc e salva no bd
	async coletar(req, res){
		try {

			if (req.body.dia == null || req.body.dia == '') {
				return res.status(400).json({
					msg: 'informar dia'
				});
			}

			const urlBacen = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='USD'&@dataCotacao='${req.body.dia}'&$top=100&$format=json&$select=cotacaoVenda,dataHoraCotacao,tipoBoletim`;
			const dadosBacen = await axios.get(urlBacen);
			// const dadosBacen = await fetch(urlBacen);
			
			//caso seja fim de semana ou feriado
			if (dadosBacen.data.value.length == 0) {
				return res.status(400).json({
					msg: 'dia nao valido'
				});
			}
			
			//definir maior e menor
			var maior = 0.0
			var menor = 99999.0;

			for (let i = 0; i < 4; i++) {
				
				if (dadosBacen.data.value[i].cotacaoVenda > maior) { maior = dadosBacen.data.value[i].cotacaoVenda}
				if (dadosBacen.data.value[i].cotacaoVenda < menor) { menor = dadosBacen.data.value[i].cotacaoVenda}
			}

			const novaPtax = await Ptax.create({
				dia: req.body.dia,
				previas: {
					p1: dadosBacen.data.value[0].cotacaoVenda,
					p2: dadosBacen.data.value[1].cotacaoVenda,
					p3: dadosBacen.data.value[2].cotacaoVenda,
					p4: dadosBacen.data.value[3].cotacaoVenda

				},
				ptax: dadosBacen.data.value[4].cotacaoVenda,
				volatilidade: (maior-menor)*1000
			});

			res.json(novaPtax);
		} catch(err) {
			return res.status(400).json({
				msg: err
			});
		}		

	},
	async medias(req, res){
		try {
			const ptax = await Ptax.find().sort({

				//ordena desc pela parametro 'dia'
				dia: -1
			}).limit(parseInt(req.params.quantidadeDias));

			return res.json(ptax);
		} catch(err) {
			return res.status(400).json({
				msg: err
			});
		}
	},
}