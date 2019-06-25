open_db_container:
	@echo '-------------------------------'
	@echo 'Opening postgres container ...'
	@echo '-------------------------------'
	@echo 'psql -U akshays94 -d ndaysofdb'
	docker container exec -it ndaysof-server_mydb_1 bash

up:
	docker-compose up	

qup:
	docker-compose up -d
	docker-compose logs --tail=100 --follow	

logs:
	docker-compose logs --tail=100 --follow	
		